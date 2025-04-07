import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import { findRelevantContent } from "@/lib/embeddings"

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages, videoId, isGeneratedTranscript } = await req.json()

    // Get the latest user message
    const latestMessage = messages[messages.length - 1].content

    // If no videoId is provided, return an error
    if (!videoId) {
      return new Response(JSON.stringify({ error: "No video ID provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log(`Processing chat request for video ${videoId}. Query: "${latestMessage.substring(0, 100)}..."`);

    // Find relevant content from the video based on the user's query - use more chunks
    const relevantContent = await findRelevantContent(latestMessage, videoId, 12)

    // Merge neighboring chunks for more coherent context if chunk_index is available
    const mergedContent = mergeNeighboringChunks(relevantContent);
    
    // Create a context from the relevant content with similarity scores and sequence information
    const context = mergedContent.map((item: { content: string; similarity: number; sequence?: number }, index: number) => 
      `[Segment ${index + 1}${item.sequence ? ` (#${item.sequence})` : ''}${item.similarity ? ` (relevance: ${Math.round(item.similarity * 100)}%)` : ''}]: ${item.content}`
    ).join("\n\n")

    // Log context size for debugging
    console.log(`Found ${mergedContent.length} context segments. Context size: ${context.length} characters`);

    // If no relevant content was found
    if (mergedContent.length === 0) {
      console.log("No relevant content found for this query");
      return streamText({
        model: openai("gpt-4o"),
        messages,
        system: `You are an AI assistant that answers questions about YouTube videos.
        
        The user is asking about a YouTube video with ID: ${videoId}.
        
        Unfortunately, I couldn't find any relevant information in the video ${isGeneratedTranscript ? "description" : "transcript"} to answer this question.
        Politely inform the user that you don't have enough information from the video to answer their specific question.`,
      }).toDataStreamResponse()
    }

    // Stream the response using AI SDK
    const result = streamText({
      model: openai("gpt-4o"),
      messages,
      system: `You are an AI assistant that answers questions about YouTube videos.
      
      The user is asking about a YouTube video with ID: ${videoId}.
      
      ${
        isGeneratedTranscript
          ? "IMPORTANT: This video does not have captions available. The following is an AI-generated description based on the video title, not an actual transcript. Your answers should acknowledge this limitation."
          : "Use the following information from the video transcript to answer the user's question:"
      }
      
      ${context}
      
      ${
        isGeneratedTranscript
          ? "Since this is based on a generated description and not an actual transcript, be clear about the speculative nature of your answers. Acknowledge when you're uncertain."
          : "If the information provided doesn't fully answer the user's question, use what you have and acknowledge the limitations."
      }
      
      Do not make up information that is not in the provided context.`,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error("Error in chat API:", error)
    return new Response(JSON.stringify({ error: "Failed to process chat request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

// Helper function to merge neighboring chunks for better context
function mergeNeighboringChunks(chunks: any[]): any[] {
  if (!chunks.length) return [];
  
  // First sort by chunk_index if available
  const hasChunkIndex = chunks.some(c => c.chunk_index !== undefined);
  
  if (!hasChunkIndex) {
    return chunks; // Return as is if no chunk_index is available
  }
  
  // Sort by chunk_index to identify neighbors
  const sortedChunks = [...chunks].sort((a, b) => 
    (a.chunk_index || 0) - (b.chunk_index || 0)
  );
  
  // Group adjacent chunks
  const mergedResults: any[] = [];
  let currentGroup: any[] = [sortedChunks[0]];
  
  for (let i = 1; i < sortedChunks.length; i++) {
    const current = sortedChunks[i];
    const previous = sortedChunks[i-1];
    
    // If this chunk directly follows the previous one, add to current group
    if (current.chunk_index !== undefined && 
        previous.chunk_index !== undefined && 
        current.chunk_index === previous.chunk_index + 1) {
      currentGroup.push(current);
    } else {
      // Process the completed group
      if (currentGroup.length > 0) {
        const avgSimilarity = currentGroup.reduce((sum, c) => sum + (c.similarity || 0), 0) / currentGroup.length;
        const mergedContent = currentGroup.map(c => c.content).join(" ");
        
        mergedResults.push({
          content: mergedContent,
          similarity: avgSimilarity,
          sequence: currentGroup[0].chunk_index
        });
      }
      
      // Start a new group
      currentGroup = [current];
    }
  }
  
  // Add the last group
  if (currentGroup.length > 0) {
    const avgSimilarity = currentGroup.reduce((sum, c) => sum + (c.similarity || 0), 0) / currentGroup.length;
    const mergedContent = currentGroup.map(c => c.content).join(" ");
    
    mergedResults.push({
      content: mergedContent,
      similarity: avgSimilarity,
      sequence: currentGroup[0].chunk_index
    });
  }
  
  // Sort merged results by similarity
  return mergedResults.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
}

