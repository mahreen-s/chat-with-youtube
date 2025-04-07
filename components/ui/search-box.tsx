import React, { InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchBoxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  isSearching?: boolean;
  onSearch: (e: React.FormEvent) => void;
  buttonClassName?: string;
  containerClassName?: string;
}

export function SearchBox({ 
  isSearching = false, 
  onSearch, 
  value, 
  onChange, 
  placeholder = "Search...", 
  className,
  buttonClassName,
  containerClassName,
  ...props 
}: SearchBoxProps) {
  return (
    <form onSubmit={onSearch} className={cn("flex gap-2", containerClassName)}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={cn("flex-1 bg-background border-border pl-9", className)}
          {...props}
        />
      </div>
      <Button 
        type="submit" 
        variant="outline" 
        disabled={isSearching || !value}
        className={cn("border-border", buttonClassName)}
      >
        {isSearching ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Search"
        )}
      </Button>
    </form>
  );
} 