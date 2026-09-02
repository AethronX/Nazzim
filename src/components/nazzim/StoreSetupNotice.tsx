import { Link } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { btnClass } from "./ui";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Shown anywhere a payment CTA would normally live while Paddle is not yet
 * configured. Never let the store look like it accepts money when it cannot.
 */
export function StoreSetupNotice({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-border-strong bg-surface/70 p-4 text-start",
        className,
      )}
      role="status"
    >
      <p className="flex items-center gap-2 text-[14.5px] font-bold">
        <Wrench className="size-4 shrink-0 text-primary" aria-hidden />
        {t("المتجر قيد الإعداد — الدفع غير مفعّل حاليًا")}
      </p>
      {compact ? null : (
        <p className="mt-1.5 text-[13px] leading-[1.8] text-muted-foreground">
          {t("نجهّز بوابة الدفع الآن. راسلنا وسنرتب لك الحصول على النظام مباشرة.")}
        </p>
      )}
      <Link to="/contact" className={btnClass("outline", "sm", "mt-3")}>
        {t("راسلنا")}
      </Link>
    </div>
  );
}
