import { AlertCircle, MessageSquare, Search, Video } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface UsageLimitsProps {
  videoRemaining: number;
  searchRemaining: number;
  chatRemaining: number;
}

export function UsageLimits({ videoRemaining, searchRemaining, chatRemaining }: UsageLimitsProps) {
  return (
    <Alert className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Daily Usage Limits</AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4" />
          <span>Videos: {videoRemaining}/1 remaining</span>
        </div>
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          <span>Searches: {searchRemaining}/3 remaining</span>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span>Questions: {chatRemaining}/5 remaining</span>
        </div>
      </AlertDescription>
    </Alert>
  );
} 