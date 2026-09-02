import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function Stars({ value = 5, className }: { value?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 align-middle", className)} aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn("size-4", i < Math.round(value) ? "fill-primary text-primary" : "text-border-strong")}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}
