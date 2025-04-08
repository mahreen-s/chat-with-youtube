# YouTube Chat

Chat with YouTube videos using AI. Ask questions about any YouTube video and get accurate answers based on the video content.

## Features

- **Chat with Video Content**: Ask questions about any YouTube video with captions
- **Smart Search**: Find relevant topics in the video and get suggested questions
- **AI Transcription Fallback**: For videos without captions, generates descriptions based on video title
- **Vector Search**: Uses advanced embedding techniques to find relevant content
- **Dark/Light Mode**: Toggle between themes for comfortable viewing
- **Responsive Design**: Works on desktop and mobile devices

## How It Works

1. **Enter a YouTube URL**: Paste a YouTube video link to process the video
2. **Processing**: The app extracts the video transcript or generates a description
3. **Chat Interface**: Ask questions about the video content
4. **Topic Search**: Search for specific topics within the video
5. **Suggested Questions**: Get AI-generated question suggestions based on your search

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, shadcn/ui components
- **AI**: OpenAI's GPT-4o for chat and content generation
- **Vector Database**: Supabase for storing and querying embeddings
- **Development**: TypeScript for type safety

## Getting Started

### Prerequisites

- Node.js 18+
- OpenAI API key
- Supabase account and project

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd youtube-chat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env.local` file with the following:
   ```
   OPENAI_API_KEY=your_openai_api_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. Set up the Supabase database:
   - Create tables for videos, video chunks, and vector storage
   - Set up the necessary SQL functions for vector similarity search

5. Run the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Add a Video**: Enter a YouTube URL and click "Process Video"
2. **Switch Tabs**: Toggle between viewing the video and chatting
3. **Ask Questions**: Type your questions in the chat input
4. **Search Topics**: Use the search box to find specific topics
5. **Try Suggestions**: Click on suggested questions to quickly ask them

## Limitations

- **Video Captions**: Works best with videos that have accurate captions
- **Generated Descriptions**: For videos without captions, responses are based on AI-generated descriptions which may not accurately reflect video content
- **Context Length**: Very long videos may have partial transcript processing
