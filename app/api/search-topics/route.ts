import { streamText } from "ai"
import { findRelevantContent } from "@/lib/embeddings"
import OpenAI from "openai"

// Initialize OpenAI client with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { query, videoId, isGeneratedTranscript } = await req.json()

    // If no videoId is provided, return an error
    if (!videoId) {
      return new Response(JSON.stringify({ error: "No video ID provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log(`Processing topic search for video ${videoId}. Query: "${query}"`);

    // Find relevant content related to the search topic
    const relevantContent = await findRelevantContent(query, videoId, 8)

    // Merge neighboring chunks
    const mergedContent = mergeNeighboringChunks(relevantContent);
    
    // Create a context from the relevant content with similarity scores
    const contentSnippets = mergedContent.map(item => item.content).join("\n\n");

    console.log(`Found ${mergedContent.length} relevant segments for topic search`);

    // If no relevant content was found
    if (mergedContent.length === 0) {
      return new Response(JSON.stringify({ 
        suggestedQuestions: [],
        message: "No relevant content found"
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Use OpenAI to generate suggested questions
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI assistant that helps generate insightful questions about video content.
          
          You will be given content from a YouTube video transcript${isGeneratedTranscript ? ' (AI-generated based on the title)' : ''} that is relevant to a user's search topic.
          
          Your task is to create 4-6 specific, clear questions the user could ask about this content.
          The questions should:
          1. Be directly answerable from the given content
          2. Cover different aspects of the topic
          3. Be conversational and natural
          4. Include specific details from the content
          5. Be interesting and insightful
          
          Return ONLY a JSON array of questions, with no other text.`
        },
        {
          role: "user",
          content: `Topic: ${query}\n\nRelevant video content:\n${contentSnippets}`
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    })

    // Parse and return the suggested questions
    const suggestedQuestions = JSON.parse(completion.choices[0].message.content || "{}").questions || [];

    return new Response(JSON.stringify({ suggestedQuestions }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error("Error in topic search API:", error)
    return new Response(JSON.stringify({ error: "Failed to process topic search" }), {
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