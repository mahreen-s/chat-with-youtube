"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, Send, Youtube, AlertTriangle, Search, Info, ArrowRight, MessageSquare, Video, ExternalLink } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { LoadingDots } from "@/components/ui/loading-dots"
import { VideoEmbed } from "@/components/ui/video-embed"
import { ChatMessage } from "@/components/ui/chat-message"
import { SuggestedQuestion } from "@/components/ui/suggested-question"
import { SearchBox } from "@/components/ui/search-box"
import { EmptyChat } from "@/components/ui/empty-chat"
import { YouTubeInput } from "@/components/ui/youtube-input"
import { AnimatedContainer } from "@/components/ui/animated-container"
import { processYoutubeVideo } from "@/lib/actions/youtube"

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [videoId, setVideoId] = useState<string | null>(null)
  const [videoTitle, setVideoTitle] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingError, setProcessingError] = useState<string | null>(null)
  const [processingSuccess, setProcessingSuccess] = useState<string | null>(null)
  const [isGeneratedTranscript, setIsGeneratedTranscript] = useState(false)
  const [searchTopic, setSearchTopic] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])

  const [messages, setMessages] = useState<{id: string; role: 'user' | 'assistant'; content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Function to search for topics in the video
  const handleTopicSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchTopic || !videoId) return
    
    setIsSearching(true)
    try {
      // Reuse the chat API to get relevant chunks
      const topicResponse = await fetch("/api/search-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: searchTopic,
          videoId: videoId,
          isGeneratedTranscript
        }),
      })
      
      if (topicResponse.ok) {
        const data = await topicResponse.json()
        setSuggestedQuestions(data.suggestedQuestions || [])
      }
    } catch (error) {
      console.error("Error searching for topics:", error)
    } finally {
      setIsSearching(false)
    }
  }

  // Function to use a suggested question
  const useQuestion = (question: string) => {
    // Set the input field to the suggested question
    setInput(question)
  }

  // New function to handle YouTube URL processing from component
  const handleProcessVideo = async (url: string) => {
    setProcessingError(null)
    setProcessingSuccess(null)
    setIsGeneratedTranscript(false)

    try {
      setIsProcessing(true)
      const extractedVideoId = extractVideoId(url)

      if (!extractedVideoId) {
        throw new Error("Invalid YouTube URL")
      }

      const result = await processYoutubeVideo(url)
      setVideoId(extractedVideoId)

      // Check if we're using a generated transcript
      if (result.isGeneratedTranscript) {
        setIsGeneratedTranscript(true)
      }

      // Fetch video title for display
      try {
        const response = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${extractedVideoId}&format=json`,
        )
        if (response.ok) {
          const data = await response.json()
          setVideoTitle(data.title)
        }
      } catch (error) {
        console.error("Error fetching video title:", error)
      }

      setProcessingSuccess(result.message || "Video processed successfully!")
    } catch (error) {
      console.error("Error processing video:", error)
      setProcessingError(error instanceof Error ? error.message : "Failed to process video")
    } finally {
      setIsProcessing(false)
    }
  }

  const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !videoId) return;

    // Add user message to chat
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call the chat API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          videoId,
          isGeneratedTranscript
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      // Get the AI response
      const data = await response.json();
      
      // Add AI message to chat
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.content
      }]);
    } catch (error) {
      console.error('Error in chat:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="container mx-auto p-4 py-8 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <Youtube className="h-8 w-8 text-[#8B5FBF]" />
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-[#8B5FBF] to-[#61398F] bg-clip-text text-transparent">
            VidChat AI
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>

      <AnimatedContainer
        variant="fade-slide-up"
        className="mb-8"
      >
        <Card className="border-border shadow-lg overflow-hidden bg-bg-100">
          <CardHeader className="bg-bg-200/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-text-100">
              <Video className="h-5 w-5 text-primary" />
              Add YouTube Video
            </CardTitle>
            <CardDescription className="text-text-200">Enter a YouTube URL to process the video and chat with its content</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <YouTubeInput
              onProcess={handleProcessVideo}
              isProcessing={isProcessing}
              processingError={processingError}
              processingSuccess={processingSuccess}
            />
          </CardContent>
        </Card>
      </AnimatedContainer>

      {videoId && (
        <AnimatedContainer variant="fade-in" duration={0.5}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="border-border shadow-lg overflow-hidden bg-bg-100">
              <CardHeader className="bg-bg-200/50 pb-4">
                <CardTitle className="line-clamp-1 text-text-100">{videoTitle || `Video ${videoId}`}</CardTitle>
                <CardDescription className="line-clamp-1 text-text-200">
                  {videoTitle ? `Video ID: ${videoId}` : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <VideoEmbed videoId={videoId} title={videoTitle || undefined} />

                {isGeneratedTranscript && (
                  <div className="p-4">
                    <Alert className="border border-yellow-600/30 bg-yellow-600/10">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertTitle className="text-yellow-500">Generated Content</AlertTitle>
                      <AlertDescription>
                        This video doesn't have captions available. We've generated a description based on the video
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-lg overflow-hidden bg-bg-100 h-[calc(100vh-12rem)] flex flex-col">
              <CardHeader className="bg-bg-200/50 pb-4">
                <CardTitle className="flex items-center gap-2 text-text-100">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Chat with Video
                </CardTitle>
                <CardDescription className="text-text-200">Ask questions about the video content</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <EmptyChat />
                ) : (
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <ChatMessage 
                        key={message.id} 
                        message={message.content}
                        isUser={message.role === "user"}
                      />
                    ))}
                    {isLoading && (
                      <div className="flex items-center justify-center p-4">
                        <LoadingDots />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-4 border-t border-border">
                <form onSubmit={handleSubmit} className="w-full space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={input}
                      onChange={handleInputChange}
                      placeholder="Ask a question about the video..."
                      className="flex-1 bg-bg-200/50 border-border"
                    />
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {suggestedQuestions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {suggestedQuestions.map((question, index) => (
                        <SuggestedQuestion
                          key={index}
                          question={question}
                          onClick={() => useQuestion(question)}
                        />
                      ))}
                    </div>
                  )}
                </form>
              </CardFooter>
            </Card>
          </div>
        </AnimatedContainer>
      )}
    </main>
  )
}

