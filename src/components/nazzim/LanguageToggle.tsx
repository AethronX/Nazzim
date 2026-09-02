import { useI18n } from "@/lib/i18n";

/** Compact AR / EN switch. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useI18n();

  return (
    <div
      className={`inline-flex items-center rounded-full border border-border-strong p-0.5 text-[11px] font-bold ${className}`}
      role="group"
      aria-label={lang === "ar" ? "تغيير اللغة" : "Change language"}
    >
      {(["ar", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`rounded-full px-2.5 py-1 uppercase transition-colors ${
            lang === code
              ? "bg-ink text-ink-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
