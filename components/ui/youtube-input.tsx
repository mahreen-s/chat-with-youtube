import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Youtube, Loader2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

interface YouTubeInputProps {
  onProcess: (url: string) => Promise<void>;
  isProcessing: boolean;
  processingError: string | null;
  processingSuccess: string | null;
}

export function YouTubeInput({ 
  onProcess, 
  isProcessing, 
  processingError, 
  processingSuccess 
}: YouTubeInputProps) {
  const [youtubeUrl, setYoutubeUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl) return;
    
    await onProcess(youtubeUrl);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Youtube className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-red-600" />
          <Input
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="Enter YouTube URL..."
            className="pl-9"
            disabled={isProcessing}
          />
        </div>
        <Button 
          type="submit" 
          disabled={isProcessing || !youtubeUrl}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing
            </>
          ) : (
            "Process Video"
          )}
        </Button>
      </form>

      {processingError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{processingError}</AlertDescription>
        </Alert>
      )}

      {processingSuccess && (
        <Alert variant="default" className="border-green-600/30 bg-green-600/10 text-green-600">
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{processingSuccess}</AlertDescription>
        </Alert>
      )}
    </div>
  );
} 