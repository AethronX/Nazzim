import { cn } from "@/lib/utils";

/**
 * Nazzim brand mark: a calm "smile" bowl with a check stroke.
 * Colors come from the current design tokens (ink arc + primary check).
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden
      className={cn("size-full", className)}
    >
      <path
        d="M25 54a25 25 0 0 0 50 0"
        stroke="currentColor"
        strokeWidth="10.5"
        strokeLinecap="round"
      />
      <path
        d="M38 40 50 52 65 28"
        stroke="var(--color-primary)"
        strokeWidth="11"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

    </svg>
  );
}
