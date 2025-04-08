import { openai } from "@/lib/openai";
import { findRelevantContent } from "@/lib/embeddings";
import { checkLimit } from "@/lib/rate-limit";

export const runtime = "edge";

// Helper function to stream data in a format readable by useChat
function streamText(text: string) {
  return new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`);
}

export async function POST(req: Request) {
  try {
    // Check chat limit
    const limitCheck = await checkLimit(req, 'chat');
    if (!limitCheck.success) {
      return limitCheck.response;
    }

    const { messages, videoId, isGeneratedTranscript } = await req.json();

    if (!videoId) {
      return new Response("Video ID is required", { status: 400 });
    }

    console.log("Processing chat request for video:", videoId);

    // Get relevant content from the video transcript
    const relevantContent = await findRelevantContent(
      messages[messages.length - 1].content,
      videoId,
      10 // Limit to 10 results
    );

    if (!relevantContent || !relevantContent.length) {
      return new Response(
        JSON.stringify({
          error: "No relevant content found in the video transcript.",
        }),
        { status: 404 }
      );
    }

    // Format the relevant content
    const formattedContent = relevantContent
      .map((item: { content: string; similarity?: number }, index: number) => 
        `[Segment ${index + 1}${item.similarity ? ` (relevance: ${Math.round(item.similarity * 100)}%)` : ''}]: ${item.content}`
      )
      .join("\n\n");

    // Create the system message with the relevant content
    const systemMessage = {
      role: "system",
      content: `You are a helpful AI assistant that answers questions about YouTube videos. 
      Use the following content from the video transcript to answer the user's question. 
      If the answer cannot be found in the transcript, say "I couldn't find specific information about that in the video."
      
      ${isGeneratedTranscript 
        ? "IMPORTANT: This video does not have captions available. The following is an AI-generated description based on the video title, not an actual transcript."
        : "Relevant content from the video:"}
      
      ${formattedContent}`,
    };

    try {
      // Create the response using OpenAI without streaming
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [systemMessage, ...messages],
        stream: false,
      });

      // Get the complete response
      const responseText = completion.choices[0].message.content || "";

      // Format the response for Vercel AI SDK
      return new Response(
        JSON.stringify({
          role: "assistant",
          content: responseText,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            ...limitCheck.headers,
          },
        }
      );
    } catch (error) {
      console.error("Error generating AI response:", error);
      return new Response(
        JSON.stringify({ error: "Failed to generate response" }),
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in chat API:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}

