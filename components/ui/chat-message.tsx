import React from "react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  className?: string;
}

export function ChatMessage({ message, isUser, className }: ChatMessageProps) {
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start", className)}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg p-3 shadow-sm",
          isUser 
            ? "bg-primary text-primary-foreground rounded-br-none" 
            : "bg-secondary text-secondary-foreground rounded-bl-none"
        )}
      >
        {message}
      </div>
    </div>
  );
} 