import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

// Initialize OpenAI client
const apiKey = process.env.OPENAI_API_KEY;
console.log("OpenAI API Key configured:", apiKey ? `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}` : "Not found");

const openai = new OpenAI({
  apiKey: apiKey,
});

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/**
 * Generate embeddings for a text using OpenAI's embedding model
 */
export async function generateEmbeddings(text: string): Promise<number[]> {
  try {
    // Clean the input text
    const input = text.replaceAll("\n", " ").trim()
    
    console.log("Generating embeddings for text length:", input.length);
    console.log("Text sample:", input.substring(0, 50) + "...");

    // Generate embedding using OpenAI's embedding model
    console.log("Calling OpenAI embedding API...");
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: input,
    })
    console.log("OpenAI API response received");

    if (!response || !response.data || !response.data[0] || !response.data[0].embedding) {
      console.error("Unexpected embedding response format:", JSON.stringify(response));
      throw new Error("Invalid embedding response format");
    }

    console.log("Embedding dimensions:", response.data[0].embedding.length);
    return response.data[0].embedding
  } catch (error) {
    console.error("Error generating embeddings:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to generate embeddings: ${error.message}`);
    } else {
      throw new Error(`Failed to generate embeddings: ${JSON.stringify(error)}`);
    }
  }
}

/**
 * Find relevant content based on a query using advanced search techniques
 */
export async function findRelevantContent(query: string, videoId: string, limit = 10) {
  try {
    console.log(`Finding relevant content for query: "${query}" in video: ${videoId}`);
    
    // Expand the query to improve recall
    const expandedQuery = await expandQuery(query);
    console.log(`Expanded query: "${expandedQuery}"`);
    
    // Generate embedding for the expanded query
    const queryEmbedding = await generateEmbeddings(expandedQuery)
    console.log("Generated query embedding successfully");

    // First, get the video UUID from the youtube_id
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("id")
      .eq("youtube_id", videoId)
      .single()

    if (videoError) {
      console.error("Error finding video:", videoError);
      throw new Error(`Video not found: ${videoError.message}`)
    }

    if (!video) {
      console.error("No video found with ID:", videoId);
      throw new Error("Video not found in database")
    }
    
    console.log(`Found video with internal ID: ${video.id}`);

    // Check if there are any chunks for this video
    const { count, error: countError } = await supabase
      .from("video_chunks")
      .select("*", { count: "exact", head: true })
      .eq("video_id", video.id);
      
    if (countError) {
      console.error("Error counting chunks:", countError);
    } else {
      console.log(`Video has ${count || 0} chunks in the database`);
      if (count === 0) {
        console.error("No chunks found for this video. The embeddings were not generated successfully.");
        return [];
      }
    }

    // Extract keywords for hybrid search
    const keywords = extractKeywords(query);
    console.log("Extracted keywords:", keywords);
    
    // Very low threshold to get more potential matches
    const matchThreshold = 0.05;
    
    // Use Supabase's advanced vector similarity search with improved scoring
    console.log("Calling match_video_chunks_advanced with:", {
      video_id: video.id,
      match_threshold: matchThreshold,
      match_count: limit * 2, // Get more candidates for reranking
    });
    
    const { data, error } = await supabase.rpc("match_video_chunks_advanced", {
      query_embedding: queryEmbedding,
      input_video_id: video.id,
      match_threshold: matchThreshold,
      match_count: limit * 2, // Retrieve more chunks than needed for reranking
      min_content_length: 20  // Skip very small chunks that likely don't contain useful info
    })

    if (error) {
      console.error("Error in vector search:", error)
      throw new Error(`Failed to search video content: ${error.message}`)
    }

    console.log(`Found ${data?.length || 0} candidate chunks from vector search`);
    
    // If we have results, rerank them using hybrid scoring (vector + keyword)
    if (data && data.length > 0) {
      // Add keyword-based scores to enhance semantic search
      const rerankedResults = hybridRanking(data, keywords, query);
      console.log(`Reranked results using hybrid scoring (vector + keyword match)`);
      
      // Take only the number of results we need
      const finalResults = rerankedResults.slice(0, limit);
      
      if (finalResults.length > 0) {
        console.log("Top chunk final score:", finalResults[0].similarity);
        console.log("Top chunk preview:", finalResults[0].content.substring(0, 100) + "...");
      }
      
      return finalResults;
    }

    return data || []
  } catch (error) {
    console.error("Error finding relevant content:", error)
    throw new Error("Failed to find relevant content")
  }
}

/**
 * Expand a user query to improve semantic search results
 */
async function expandQuery(query: string): Promise<string> {
  // For simple queries, return as is to save API calls
  if (query.length < 15) return query;
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a search query expansion AI. Your task is to rewrite search queries to make them more effective for semantic search.
          Expand the query by adding relevant terms, synonyms, and context while keeping it concise. Don't make it longer than 2-3 sentences.
          Don't use phrases like "searching for information about". Just output the improved query directly.`
        },
        {
          role: "user",
          content: `Expand this query for semantic search: "${query}"`
        }
      ],
      max_tokens: 150,
      temperature: 0.5,
    });
    
    const expandedQuery = response.choices[0].message.content?.trim() || query;
    
    // If expansion failed or is much longer, stick with original
    if (!expandedQuery || expandedQuery.length > query.length * 3) {
      return query;
    }
    
    return expandedQuery;
  } catch (error) {
    console.error("Query expansion failed:", error);
    // On failure, fall back to the original query
    return query;
  }
}

/**
 * Extract important keywords from a query
 */
function extractKeywords(query: string): string[] {
  // Convert to lowercase and remove punctuation
  const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, '');
  
  // Split into words
  const words = cleanQuery.split(/\s+/).filter(word => word.length > 0);
  
  // Filter out common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 
    'what', 'which', 'who', 'whom', 'whose', 'why', 'how', 'when', 'where',
    'that', 'this', 'these', 'those', 'to', 'for', 'with', 'about', 'against',
    'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'does', 'do',
    'did', 'can', 'could', 'would', 'should', 'will', 'shall', 'may', 'might', 'have',
    'has', 'had', 'having', 'be', 'been', 'being', 'as', 'if', 'then', 'else',
    'of', 'at', 'by'
  ]);
  
  // Return keywords (non-stop words)
  return words.filter(word => !stopWords.has(word) && word.length > 2);
}

/**
 * Rerank results using a hybrid approach (vector similarity + keyword matching)
 */
function hybridRanking(
  vectorResults: Array<{id: string, video_id: string, content: string, similarity: number}>, 
  keywords: string[],
  originalQuery: string
): Array<{id: string, video_id: string, content: string, similarity: number}> {
  if (!keywords.length) return vectorResults;
  
  return vectorResults.map(result => {
    const content = result.content.toLowerCase();
    let keywordScore = 0;
    
    // Score based on keyword presence
    keywords.forEach(keyword => {
      if (content.includes(keyword.toLowerCase())) {
        keywordScore += 0.03; // Boost for each matching keyword
      }
    });
    
    // Extra boost for exact phrase matches
    const exactPhraseBoost = originalQuery.length > 5 && content.includes(originalQuery.toLowerCase()) ? 0.1 : 0;
    
    // Final score combines vector similarity with keyword bonuses
    const hybridScore = result.similarity + keywordScore + exactPhraseBoost;
    
    return {
      ...result,
      similarity: Math.min(hybridScore, 1.0) // Cap at 1.0
    };
  }).sort((a, b) => b.similarity - a.similarity); // Sort by combined score
}

