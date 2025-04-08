import { processYoutubeVideo } from "@/lib/actions/youtube";
import { checkLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    // Check video limit
    const limitCheck = await checkLimit(req, 'video');
    if (!limitCheck.success) {
      return limitCheck.response;
    }

    const { url } = await req.json();

    if (!url) {
      return new Response("YouTube URL is required", { status: 400 });
    }

    console.log("Processing YouTube video:", url);

    const result = await processYoutubeVideo(url);

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.message || "Failed to process video" }),
        { status: 400 }
      );
    }

    return new Response(JSON.stringify(result), {
      headers: {
        "Content-Type": "application/json",
        ...limitCheck.headers,
      },
    });
  } catch (error) {
    console.error("Error in video processing API:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
} 