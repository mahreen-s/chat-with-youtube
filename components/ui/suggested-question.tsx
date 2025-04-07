import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuggestedQuestionProps {
  question: string;
  onClick: (question: string) => void;
  className?: string;
}

export function SuggestedQuestion({ question, onClick, className }: SuggestedQuestionProps) {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className={cn(
        "justify-start text-left text-xs border-border bg-card hover:bg-secondary h-auto py-2", 
        className
      )}
      onClick={() => onClick(question)}
    >
      <span className="truncate mr-2">{question}</span>
      <ArrowRight className="ml-auto h-3 w-3 shrink-0 opacity-70" />
    </Button>
  );
} 