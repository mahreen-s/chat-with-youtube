import React from "react";
import { cn } from "@/lib/utils";

type AnimationVariant = "fade-in" | "slide-up" | "scale-in" | "fade-slide-up";

interface AnimatedContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: AnimationVariant;
  delay?: number; // in seconds
  duration?: number; // in seconds
}

export function AnimatedContainer({
  children,
  className,
  variant = "fade-in",
  delay = 0,
  duration = 0.3,
}: AnimatedContainerProps) {
  const style = {
    "--delay": `${delay}s`,
    "--duration": `${duration}s`,
  } as React.CSSProperties;

  const getAnimationClass = () => {
    switch (variant) {
      case "fade-in":
        return "animate-fade-in";
      case "slide-up":
        return "animate-slide-up";
      case "scale-in":
        return "animate-scale-in";
      case "fade-slide-up":
        return "animate-fade-slide-up";
      default:
        return "animate-fade-in";
    }
  };

  return (
    <div
      className={cn(getAnimationClass(), className)}
      style={style}
    >
      {children}
    </div>
  );
}

// Add this to your globals.css or tailwind.config.js
// @keyframes fadeIn {
//   from { opacity: 0; }
//   to { opacity: 1; }
// }
// @keyframes slideUp {
//   from { transform: translateY(20px); }
//   to { transform: translateY(0); }
// }
// @keyframes scaleIn {
//   from { transform: scale(0.95); opacity: 0; }
//   to { transform: scale(1); opacity: 1; }
// }
// @keyframes fadeSlideUp {
//   from { transform: translateY(20px); opacity: 0; }
//   to { transform: translateY(0); opacity: 1; }
// }
// .animate-fade-in { animation: fadeIn var(--duration, 0.3s) ease-out var(--delay, 0s); }
// .animate-slide-up { animation: slideUp var(--duration, 0.3s) ease-out var(--delay, 0s); }
// .animate-scale-in { animation: scaleIn var(--duration, 0.3s) ease-out var(--delay, 0s); }
// .animate-fade-slide-up { animation: fadeSlideUp var(--duration, 0.3s) ease-out var(--delay, 0s); } 