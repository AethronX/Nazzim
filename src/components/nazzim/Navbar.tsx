import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { announcement } from "@/data/site";
import { ButtonLink } from "./ui";
import { cn } from "@/lib/utils";
import { BrandMark } from "./BrandMark";
import { LanguageToggle } from "@/components/nazzim/LanguageToggle";
import { useT } from "@/lib/i18n";

const nav = [
  { to: "/", label: "الرئيسية", exact: true },
  {
    to: "/products/$slug",
    params: { slug: "habit-tracker" },
    label: "متتبع العادات والمهام",
    exact: false,
  },
  { to: "/contact", label: "تواصل", exact: false },
] as const;

export function Logo({ compact = false }: { compact?: boolean }) {
  const t = useT();
  return (
    <Link
      to="/"
      className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-lg"
      aria-label={t("Nazzim نظّم — الصفحة الرئيسية")}
    >
      <span
        aria-hidden
        className={cn(
          "grid place-items-center rounded-xl bg-surface text-foreground shadow-soft",
          compact ? "size-8 p-1.5" : "size-11 p-2 sm:size-14 sm:p-2.5",
        )}
      >
        <BrandMark />
      </span>
      <span className="flex items-baseline gap-1.5">
        <span
          className={cn(
            "latin font-extrabold tracking-tight",
            compact ? "text-[16px]" : "text-[26px] sm:text-[32px]",
          )}
        >
          Nazzim
        </span>
        {!compact ? (
          <span className="text-[17px] font-semibold text-muted-foreground sm:text-[21px]">{t("نظّم")}</span>
        ) : null}
      </span>
    </Link>
  );
}


function Marquee() {
  const t = useT();
  const itemCount = 24;
  const Item = ({ i }: { i: number }) => (
    <span key={i} className="flex items-center gap-x-3 sm:gap-x-4">
      <span className="text-[13px] font-semibold tracking-[0.06em] whitespace-nowrap sm:text-[17px]">
        {t(announcement)}
      </span>
      <span className="size-1 rounded-full bg-ink-foreground/50 sm:size-1.5" aria-hidden="true" />
    </span>
  );
  const items = Array.from({ length: itemCount }, (_, i) => <Item key={i} i={i} />);
  return (
    <div className="overflow-hidden bg-ink py-3 text-ink-foreground sm:py-4">
      <div className="flex w-max animate-marquee gap-x-8 sm:gap-x-12">
        <div className="flex items-center gap-x-8 sm:gap-x-12">{items}</div>
        <div className="flex items-center gap-x-8 sm:gap-x-12" aria-hidden="true">
          {items}
        </div>
      </div>
    </div>
  );
}


export function Navbar() {
  const t = useT();
  const { count, openCart } = useCart();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <Marquee />
      <header
        className={cn(
          "sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur transition-shadow",
          scrolled && "shadow-soft",
        )}
      >
        <div className="container-nz grid h-20 grid-cols-[1fr_auto_1fr] items-center sm:h-[104px]">
          {/* Start: primary links on desktop, menu button on mobile */}
          <div className="flex items-center justify-start gap-1">
            <nav className="hidden items-center gap-1 lg:flex">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  params={"params" in item ? item.params : undefined}
                  activeOptions={{ exact: item.exact }}
                  className="rounded-lg px-3.5 py-2 text-[14px] font-semibold text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                  activeProps={{ className: "!bg-ink !text-ink-foreground" }}
                >
                  {t(item.label)}
                </Link>
              ))}
            </nav>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={t("القائمة")}
              aria-expanded={open}
              className="grid size-11 place-items-center rounded-full transition-colors hover:bg-surface lg:hidden"
            >
              {open ? <X className="size-[21px]" /> : <Menu className="size-[21px]" />}
            </button>
          </div>

          <div className="flex justify-center">
            <Logo />
          </div>

          {/* End: language + cart */}
          <div className="flex items-center justify-end gap-1.5">
            <LanguageToggle className="hidden sm:inline-flex" />
            <button
              type="button"
              onClick={openCart}
              aria-label={t("السلة")}
              className="relative grid size-11 place-items-center rounded-full transition-colors hover:bg-surface"
            >
              <ShoppingBag className="size-[21px]" strokeWidth={1.7} />
              {count > 0 ? (
                <span className="absolute top-1 left-1 grid min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular-nums">
                  {count}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {open ? (
          <div className="border-t border-border bg-background">
            <nav className="container-nz flex flex-col py-3">
              {nav.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  activeOptions={{ exact: item.exact }}
                  className="rounded-xl px-3 py-3.5 text-[15px] font-medium text-foreground transition-colors hover:bg-surface"
                  activeProps={{ className: "!bg-ink !text-ink-foreground" }}
                >
                  {t(item.label)}
                </Link>
              ))}
              <div className="mt-2 flex justify-start px-3">
                <LanguageToggle />
              </div>
              <ButtonLink
                to="/products"
                onClick={() => setOpen(false)}
                variant="primary"
                size="md"
                className="mt-2 w-full"
              >
                {t("تصفح المنتجات")}
              </ButtonLink>
            </nav>
          </div>
        ) : null}
      </header>
    </>
  );
}
