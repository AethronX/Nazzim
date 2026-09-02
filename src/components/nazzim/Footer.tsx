import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { Logo } from "./Navbar";
import { useT } from "@/lib/i18n";

const groups = [
  {
    title: "المتجر",
    links: [
      { to: "/", label: "الرئيسية" },
      { to: "/products", label: "المنتجات" },
      { to: "/how-it-works", label: "كيف يعمل؟" },
      { to: "/faq", label: "الأسئلة الشائعة" },
    ],
  },
  {
    title: "الدعم والسياسات",
    links: [
      { to: "/contact", label: "تواصل معنا" },
      { to: "/privacy", label: "الخصوصية" },
      { to: "/terms", label: "الشروط" },
      { to: "/refund", label: "الاسترجاع" },
    ],
  },
] as const;

export function Footer() {
  const t = useT();
  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-nz py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-muted-foreground">
              {t("نظّم يومك. تابع تقدمك. أنجز ما يهمك.")}
            </p>
            <Link
              to="/contact"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-semibold text-ink-foreground transition-opacity hover:opacity-90"
            >
              <MessageCircle className="size-4" />
              {t("تواصل معنا")}
            </Link>
          </div>
          {groups.map((g) => (
            <nav key={g.title}>
              <h3 className="text-[13px] font-semibold text-foreground">{t(g.title)}</h3>
              <ul className="mt-4 space-y-2.5">
                {g.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="text-[14px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t(l.label)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-6 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t("© 2026 Nazzim. جميع الحقوق محفوظة.")}</p>
          <p className="latin font-medium">@Nazzim — Template.</p>
        </div>
      </div>
    </footer>
  );
}
