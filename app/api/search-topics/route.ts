import { OpenAI } from "openai"
import { findRelevantContent } from "@/lib/embeddings"

// Initialize OpenAI client with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // Remove mock limit headers completely
    const { query, videoId, isGeneratedTranscript } = await req.json()

    // If no videoId is provided, return an error
    if (!videoId) {
      return new Response("Video ID is required", { status: 400 });
    }

    console.log("Processing topic search for video:", videoId);

    // Find relevant content related to the search topic
    const relevantContent = await findRelevantContent(query, videoId, 8)

    if (!relevantContent || !relevantContent.length) {
      return new Response(
        JSON.stringify({
          error: "No relevant content found in the video transcript.",
        }),
        { status: 404 }
      );
    }

    // Merge neighboring chunks
    const mergedContent = mergeNeighboringChunks(relevantContent);
    
    // Format the content
    const formattedContent = mergedContent
      .map((item: { content: string; similarity?: number }, index: number) => 
        `[Segment ${index + 1}${item.similarity ? ` (relevance: ${Math.round(item.similarity * 100)}%)` : ''}]: ${item.content}`
      )
      .join("\n\n");

    // Generate suggested questions based on the relevant content
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a helpful AI assistant that generates insightful questions about YouTube video content.
          Based on the following content from the video transcript, generate 3-5 specific, clear, and insightful questions that users might want to ask.
          The questions should be directly related to the content and help users understand the video better.
          
          ${isGeneratedTranscript 
            ? "IMPORTANT: This video does not have captions available. The following is an AI-generated description based on the video title, not an actual transcript."
            : "Content from the video:"}
          
          ${formattedContent}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const questions = response.choices[0].message.content
      ?.split("\n")
      .filter((q) => q.trim().length > 0)
      .map((q) => q.replace(/^\d+\.\s*/, "").trim());

    return new Response(JSON.stringify({ suggestedQuestions: questions }), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in search topics API:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
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