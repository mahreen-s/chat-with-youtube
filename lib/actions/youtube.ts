"use server"

import { z } from "zod"
import { createClient } from "@supabase/supabase-js"
import { generateEmbeddings } from "../embeddings"
import { getYoutubeTranscript, getYoutubeVideoDetails } from "../youtube"

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const YoutubeUrlSchema = z.string().url()

export async function processYoutubeVideo(youtubeUrl: string) {
  try {
    // Validate the YouTube URL
    YoutubeUrlSchema.parse(youtubeUrl)

    // Extract video ID from URL
    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      throw new Error("Invalid YouTube URL")
    }

    // Check if video already exists in database
    const { data: existingVideo, error: existingVideoError } = await supabase
      .from("videos")
      .select("id, is_generated_transcript")
      .eq("youtube_id", videoId)
      .single()

    if (existingVideoError) {
      // If error is not a "not found" error, then it's a real database error
      if (existingVideoError.code !== 'PGRST116') {
        console.error("Error checking for existing video:", existingVideoError);
        throw new Error(`Database error: ${existingVideoError.message || 'Unknown error checking for existing video'}`);
      }
      // Otherwise, the video doesn't exist, which is fine
    }

    if (existingVideo) {
      // If video exists, return its ID and a flag indicating if it uses a generated transcript
      return {
        success: true,
        videoId,
        message: "Video already processed",
        isGeneratedTranscript: existingVideo.is_generated_transcript,
      }
    }

    // Fetch video details and transcript
    const videoDetails = await getYoutubeVideoDetails(videoId)
    
    // Validate video details before proceeding
    if (!videoDetails.title) {
      throw new Error("Failed to get video title")
    }
    
    let transcript
    let isGeneratedTranscript = false

    try {
      transcript = await getYoutubeTranscript(videoId)
      // Check if the transcript is AI-generated (contains our note)
      isGeneratedTranscript = transcript.startsWith("[Note: This video does not have captions available")
    } catch (error) {
      throw new Error(`Transcript error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }

    // Ensure transcript is not empty
    if (!transcript || transcript.trim() === '') {
      throw new Error("Empty transcript received. Cannot process this video.")
    }

    // Store video information in database
    console.log("Attempting to insert video:", { videoId, title: videoDetails.title });
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .insert({
        youtube_id: videoId,
        title: videoDetails.title,
        author: videoDetails.author,
        thumbnail_url: videoDetails.thumbnailUrl,
        transcript: transcript,
        is_generated_transcript: isGeneratedTranscript,
      })
      .select()
      .single()

    if (videoError) {
      console.error("Video insertion error details:", videoError);
      
      // Additional logging of the error object
      console.error("Error object type:", typeof videoError);
      console.error("Error JSON:", JSON.stringify(videoError));
      
      // Check if it's a duplicate key violation
      if (videoError.code === '23505' || 
          (videoError.details && videoError.details.includes('already exists')) ||
          (videoError.message && videoError.message.includes('unique constraint'))) {
        throw new Error(`Video with ID ${videoId} already exists in the database`);
      }
      
      // Check if transcript is too large
      if (transcript && transcript.length > 1000000) {
        throw new Error("Transcript too large for database storage")
      }
      
      // If we reach here, it's an unknown error
      throw new Error(`Failed to store video: ${videoError.code || videoError.message || 'Unknown database error. Please check logs for details.'}`)
    }

    // Process transcript into chunks and generate embeddings
    const chunks = chunkTranscript(transcript)
    console.log(`Generated ${chunks.length} chunks from transcript`);

    // Process chunks in batches to avoid rate limiting
    const batchSize = 5;
    let successfulChunks = 0;
    
    console.log(`Processing all ${chunks.length} chunks in batches of ${batchSize}`);
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      console.log(`\n--- Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(chunks.length/batchSize)}, chunks ${i+1}-${Math.min(i + batchSize, chunks.length)} ---`);
      
      // Process batch in parallel
      const results = await Promise.all(
        batch.map(async (chunk, index) => {
          const chunkIndex = i + index;
          console.log(`Processing chunk ${chunkIndex+1}/${chunks.length}, length: ${chunk.length} characters`);
          
          try {
            // Generate embedding for chunk
            const embedding = await generateEmbeddings(chunk);
            console.log(`Successfully generated embedding for chunk ${chunkIndex+1}. Length: ${embedding.length}`);
            
            // Store in database
            const { error: chunkError } = await supabase.from("video_chunks").insert({
              video_id: video.id,
              chunk_index: chunkIndex,
              content: chunk.substring(0, Math.min(chunk.length, 10000)),
              embedding: embedding,
            });
            
            if (chunkError) {
              console.error(`Failed to store chunk ${chunkIndex+1} in database:`, chunkError);
              return false;
            } else {
              console.log(`Successfully stored chunk ${chunkIndex+1} in database`);
              return true;
            }
          } catch (error) {
            console.error(`Error processing chunk ${chunkIndex+1}:`, error);
            
            // Try with a shorter chunk if it might be too long
            if (chunk.length > 1000) {
              try {
                console.log(`Retrying chunk ${chunkIndex+1} with shorter length (1000 chars)`);
                const shorterChunk = chunk.substring(0, 1000);
                const embedding = await generateEmbeddings(shorterChunk);
                
                // Store shortened chunk
                const { error: chunkError } = await supabase.from("video_chunks").insert({
                  video_id: video.id,
                  chunk_index: chunkIndex,
                  content: shorterChunk,
                  embedding: embedding,
                });
                
                if (chunkError) {
                  console.error(`Failed to store shortened chunk ${chunkIndex+1}:`, chunkError);
                  return false;
                } else {
                  console.log(`Successfully stored shortened chunk ${chunkIndex+1}`);
                  return true;
                }
              } catch (retryError) {
                console.error(`Failed retry for chunk ${chunkIndex+1}:`, retryError);
                return false;
              }
            }
            return false;
          }
        })
      );
      
      // Count successful chunks in this batch
      const batchSuccesses = results.filter(success => success).length;
      successfulChunks += batchSuccesses;
      console.log(`Batch ${Math.floor(i/batchSize) + 1} results: ${batchSuccesses}/${batch.length} chunks processed successfully`);
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < chunks.length) {
        console.log("Waiting 1 second before next batch...");
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n--- Final results: ${successfulChunks}/${chunks.length} chunks stored successfully ---`);
    
    // If we couldn't store any chunks, we have a problem
    if (successfulChunks === 0 && chunks.length > 0) {
      throw new Error("Failed to store any chunks. Vector search will not work.");
    }
    
    return {
      success: true,
      videoId,
      isGeneratedTranscript,
    }
  } catch (error) {
    console.error("Error processing YouTube video:", error)
    throw error
  }
}

// Helper function to extract video ID from YouTube URL
function extractVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
  const match = url.match(regExp)
  return match && match[2].length === 11 ? match[2] : null
}

// Function to chunk transcript into smaller pieces for embedding
function chunkTranscript(transcript: string, maxChunkLength = 500, overlap = 30): string[] {
  if (!transcript || transcript.length === 0) {
    return []
  }

  console.log(`Original transcript length: ${transcript.length} characters`);
  const words = transcript.split(" ")
  const chunks: string[] = []
  let currentChunk: string[] = []

  for (const word of words) {
    currentChunk.push(word)

    if (currentChunk.join(" ").length >= maxChunkLength) {
      chunks.push(currentChunk.join(" "))
      // Keep some overlap for context continuity
      currentChunk = currentChunk.slice(-Math.min(overlap, currentChunk.length))
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "))
  }

  console.log(`Created ${chunks.length} chunks with max length ${maxChunkLength} and overlap ${overlap}`);
  return chunks
}

