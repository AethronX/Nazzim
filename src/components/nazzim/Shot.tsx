import dashboard from "@/assets/shots/dashboard.png.asset.json";
import habits from "@/assets/shots/habits.png.asset.json";
import tasks from "@/assets/shots/tasks.png.asset.json";
import goals from "@/assets/shots/goals.png.asset.json";
import progress from "@/assets/shots/progress.png.asset.json";
import system from "@/assets/shots/system.png.asset.json";
import { cn } from "@/lib/utils";
import { visualTitles, type VisualKey } from "./ProductVisual";

export const shots: Record<VisualKey, string> = {
  dashboard: dashboard.url,
  habits: habits.url,
  tasks: tasks.url,
  goals: goals.url,
  progress: progress.url,
  system: system.url,
};

export function Shot({
  variant,
  className,
  eager,
  alt,
}: {
  variant: VisualKey;
  className?: string;
  eager?: boolean;
  alt?: string;
}) {
  return (
    <img
      src={shots[variant]}
      alt={alt ?? `${visualTitles[variant]} — Nazzim`}
      width={980}
      height={802}
      loading={eager ? "eager" : "lazy"}
      decoding={eager ? "sync" : "async"}
      fetchPriority={eager ? "high" : "auto"}
      className={cn("w-full rounded-2xl border border-border bg-card", className)}
    />
  );
}
