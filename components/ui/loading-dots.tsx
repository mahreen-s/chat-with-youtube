export function LoadingDots() {
  return (
    <div className="flex gap-1 items-center">
      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></div>
    </div>
  );
} 