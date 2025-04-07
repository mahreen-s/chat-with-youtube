import { YoutubeTranscript } from "youtube-transcript"
import OpenAI from "openai"

// Initialize OpenAI client for fallback transcription
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface TranscriptResponse {
  text: string
  duration: number
  offset: number
}

export async function getYoutubeTranscript(videoId: string): Promise<string> {
  try {
    // First attempt: Try to get the official transcript
    const transcript = await YoutubeTranscript.fetchTranscript(videoId)
    console.log("Transcript:", transcript)

    if (!transcript || transcript.length === 0) {
      throw new Error("No transcript available for this video")
    }

    // Combine all transcript parts into a single string
    return transcript.map((item: TranscriptResponse) => item.text).join(" ")
  } catch (error) {
    console.error("Error fetching YouTube transcript:", error)

    // Fallback: Get video details and generate a description using OpenAI
    try {
      console.log("Attempting to generate transcript alternative...")
      return await generateVideoDescription(videoId)
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError)
      throw new Error(
        "This video does not have captions available. Please try a different video with captions enabled.",
      )
    }
  }
}

async function generateVideoDescription(videoId: string): Promise<string> {
  try {
    // Get basic video information
    const videoDetails = await getYoutubeVideoDetails(videoId)

    // Use OpenAI to generate a description based on the video title
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content:
            "You are an assistant that creates detailed descriptions of YouTube videos based on their titles. Create a comprehensive summary that could serve as a transcript alternative.",
        },
        {
          role: "user",
          content: `Create a detailed description for a YouTube video titled: "${videoDetails.title}". 
          The description should be comprehensive enough to answer questions about the video content.
          Format it as if it were a transcript, with detailed information about what might be discussed in the video.
          Include likely key points, explanations, and concepts that would be covered in a video with this title.
          Make it at least 500 words long.`,
        },
      ],
    })

    const generatedDescription = completion.choices[0].message.content || ""

    // Return the generated description with a note
    return `[Note: This video does not have captions available. The following is an AI-generated description based on the video title.]\n\n${generatedDescription}`
  } catch (error) {
    console.error("Error generating video description:", error)
    throw new Error("Failed to generate alternative transcript")
  }
}

export async function getYoutubeVideoDetails(videoId: string) {
  try {
    // Using oEmbed to get basic video information
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    )

    if (!response.ok) {
      throw new Error("Failed to fetch video details")
    }

    const data = await response.json()

    return {
      title: data.title,
      author: data.author_name,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    }
  } catch (error) {
    console.error("Error fetching video details:", error)
    // Fallback to a basic title if we can't get the actual title
    return {
      title: `YouTube Video ${videoId}`,
      author: "Unknown",
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    }
  }
}

