import { cn } from "@/lib/utils";
import { ProductVisual, visualTitles, type VisualKey } from "./ProductVisual";

/**
 * Product screen.
 *
 * These used to be PNG screenshots served from Lovable's asset CDN
 * (/__l5e/assets-v1/...). That path only resolves while the app is hosted by
 * Lovable, so every image 404'd once the site moved to its own domain.
 * We now render the same screens with <ProductVisual />, which draws them in
 * pure CSS — no external asset host, nothing to break.
 */
export function Shot({
  variant,
  className,
  eager,
  alt,
}: {
  variant: VisualKey;
  className?: string;
  /** Kept for call-site compatibility; nothing is fetched any more. */
  eager?: boolean;
  alt?: string;
}) {
  void eager;
  return (
    <div
      role="img"
      aria-label={alt ?? `${visualTitles[variant]} — Nazzim`}
      className={cn("w-full", className)}
    >
      <ProductVisual variant={variant} />
    </div>
  );
}
