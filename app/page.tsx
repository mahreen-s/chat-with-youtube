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
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-600" />
          <h1 className="text-2xl font-bold tracking-tight">YouTube Chat</h1>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>

      <AnimatedContainer
        variant="fade-slide-up"
        className="mb-8"
      >
        <Card className="border-border shadow-sm overflow-hidden">
          <CardHeader className="bg-secondary/30 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              Add YouTube Video
            </CardTitle>
            <CardDescription>Enter a YouTube URL to process the video and chat with its content</CardDescription>
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
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-secondary text-secondary-foreground mb-6 rounded-lg p-1">
              <TabsTrigger 
                value="video" 
                className="data-[state=active]:bg-background rounded-md gap-2 py-2"
              >
                <Video className="h-4 w-4" />
                Video
              </TabsTrigger>
              <TabsTrigger 
                value="chat" 
                className="data-[state=active]:bg-background rounded-md gap-2 py-2"
              >
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
            </TabsList>

            <TabsContent value="video" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <Card className="border-border shadow-sm overflow-hidden">
                <CardHeader className="bg-secondary/30 pb-4">
                  <CardTitle className="line-clamp-1">{videoTitle || `Video ${videoId}`}</CardTitle>
                  <CardDescription className="line-clamp-1">
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
                          title. Responses may not be as accurate as with videos that have proper transcripts.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="chat" className="mt-0 focus-visible:outline-none focus-visible:ring-0">
              <Card className="border-border shadow-sm">
                <CardHeader className="bg-secondary/30 pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Chat with {videoTitle ? <span className="line-clamp-1">{videoTitle}</span> : `Video ${videoId}`}
                  </CardTitle>
                  <CardDescription>Ask questions about the video content or search for specific topics</CardDescription>

                  {isGeneratedTranscript && (
                    <Alert className="mt-2 border border-yellow-600/30 bg-yellow-600/10">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <AlertTitle className="text-yellow-500">Using AI-Generated Description</AlertTitle>
                      <AlertDescription>
                        Since this video doesn't have captions, responses are based on an AI-generated description and may
                        not accurately reflect the actual video content.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardHeader>
                <CardContent className="p-4 pt-6">
                  {videoId && (
                    <div className="mb-6">
                      <SearchBox
                        placeholder="Search for topics in this video..."
                        value={searchTopic}
                        onChange={(e) => setSearchTopic(e.target.value)}
                        onSearch={handleTopicSearch}
                        isSearching={isSearching}
                        containerClassName="mb-3"
                      />
                      
                      {suggestedQuestions.length > 0 && (
                        <AnimatedContainer variant="fade-slide-up" className="space-y-3 bg-secondary/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Info className="h-3.5 w-3.5" />
                            <span>Suggested questions about <span className="font-medium">{searchTopic}</span>:</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {suggestedQuestions.map((question, index) => (
                              <SuggestedQuestion
                                key={index}
                                question={question}
                                onClick={useQuestion}
                              />
                            ))}
                          </div>
                        </AnimatedContainer>
                      )}
                    </div>
                  )}
                  
                  <div className="h-[60vh] overflow-y-auto mb-4 p-4 rounded-lg bg-card border border-border transition-all">
                    {messages.length === 0 ? (
                      <AnimatedContainer variant="fade-in" duration={0.6}>
                        <EmptyChat />
                      </AnimatedContainer>
                    ) : (
                      <div className="space-y-6">
                        {messages.map((message, index) => (
                          <AnimatedContainer
                            key={message.id}
                            variant="fade-slide-up"
                            delay={index * 0.05}
                          >
                            <ChatMessage 
                              message={message.content}
                              isUser={message.role === "user"}
                            />
                          </AnimatedContainer>
                        ))}

                        {isLoading && (
                          <AnimatedContainer variant="fade-in" duration={0.2}>
                            <div className="flex justify-start">
                              <div className="max-w-[85%] rounded-lg p-3 shadow-sm bg-secondary text-secondary-foreground rounded-bl-none">
                                <LoadingDots />
                              </div>
                            </div>
                          </AnimatedContainer>
                        )}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        placeholder="Ask a question about the video..."
                        value={input}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        className="bg-background border-border pr-12"
                      />
                      <Button 
                        type="submit" 
                        disabled={isLoading || !input}
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </AnimatedContainer>
      )}
    </main>
  )
}

