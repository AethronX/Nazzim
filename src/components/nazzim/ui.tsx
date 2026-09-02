import { track } from "@/lib/analytics";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";
import { useT } from "@/lib/i18n";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

const variants = {
  primary: "bg-ink text-ink-foreground hover:bg-ink/90 shadow-soft",
  accent: "brand-gradient text-primary-foreground hover:brightness-110 shadow-lift",
  outline: "border border-border-strong bg-background text-foreground hover:bg-surface",
  ghost: "text-foreground hover:bg-surface",
} as const;

const sizes = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5",
  lg: "h-13 px-7 text-[15px]",
} as const;

export type BtnVariant = keyof typeof variants;

export function btnClass(variant: BtnVariant = "primary", size: keyof typeof sizes = "md", extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: BtnVariant; size?: keyof typeof sizes }) {
  return <button className={btnClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: BtnVariant; size?: keyof typeof sizes }) {
  return <Link className={btnClass(variant, size, className)} {...props} />;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
      <span className="size-1.5 rounded-full bg-primary" />
      {children}
    </span>
  );
}

export function Section({
  children,
  className,
  id,
  tone = "default",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: "default" | "surface";
}) {
  return (
    <section
      id={id}
      className={cn("py-16 sm:py-24", tone === "surface" && "bg-surface/60", className)}
    >
      <div className="container-nz">{children}</div>
    </section>
  );
}

export function SectionHead({
  title,
  description,
  eyebrow,
  align = "start",
  as: Heading = "h2",
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  align?: "start" | "center";
  /** Use h1 when this heading is the page's main title. */
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <Heading
        className={cn(
          "text-2xl font-bold leading-tight sm:text-4xl",
          eyebrow ? "mt-4" : undefined,
        )}
      >
        {title}
      </Heading>
      {description ? (
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  as = "input",
  ...props
}: {
  label: string;
  as?: "input" | "textarea";
} & ComponentProps<"input"> &
  ComponentProps<"textarea">) {
  const cls =
    "w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/15";
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-foreground">{label}</span>
      {as === "textarea" ? (
        <textarea className={cn(cls, "min-h-32 resize-y")} {...props} />
      ) : (
        <input className={cls} {...props} />
      )}
    </label>
  );
}

export function LegalPage({ title, intro, sections }: {
  title: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
}) {
  const t = useT();
  return (
    <div className="container-nz py-16 sm:py-24">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold sm:text-4xl">{t(title)}</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">{t(intro)}</p>
        <div className="mt-10 space-y-8">
          {sections.map((s) => (
            <div key={s.heading}>
              <h2 className="text-lg font-semibold">{t(s.heading)}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
                  {t(p)}
                </p>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-12 rounded-xl border border-border bg-surface/70 p-4 text-[13px] text-muted-foreground">
          {t("هذا النص نموذجي وقابل للتعديل بالكامل ليطابق سياسة المتجر الفعلية.")}
        </p>
      </div>
    </div>
  );
}

/** Accessible FAQ list built on native <details> (keyboard + SR friendly, no JS). */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const t = useT();
  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((item) => (
        <details key={item.q} className="group px-5">
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => track("faq_open", { question: item.q })}
          >
            {t(item.q)}
            <span
              aria-hidden
              className="grid size-7 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="pb-5 text-[14px] leading-[1.9] text-muted-foreground">{t(item.a)}</p>
        </details>
      ))}
    </div>
  );
}
