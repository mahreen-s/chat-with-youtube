import { MessageSquare } from "lucide-react";

interface EmptyChatProps {
  message?: string;
  subMessage?: string;
}

export function EmptyChat({
  message = "Ask questions about the video content!",
  subMessage = "Try searching for topics or asking specific questions"
}: EmptyChatProps) {
  return (
    <div className="text-center text-muted-foreground h-full flex flex-col items-center justify-center gap-3 opacity-90">
      <MessageSquare className="h-12 w-12 opacity-20" />
      <div>
        <p className="mb-1">{message}</p>
        <p className="text-sm opacity-75">{subMessage}</p>
      </div>
    </div>
  );
} 