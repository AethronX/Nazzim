import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button, Field, SectionHead } from "@/components/nazzim/ui";
import { useT } from "@/lib/i18n";

const title = "تواصل معنا | Nazzim نظّم";
const description = "أرسل سؤالك أو ملاحظتك لفريق Nazzim وسنعود إليك بالبريد الإلكتروني.";

/** قابل للتعديل */
const SUPPORT_EMAIL = "support@nazzim.com";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const t = useT();
  const [sent, setSent] = useState(false);

  return (
    <div className="container-nz py-14 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <SectionHead
          as="h1"
            eyebrow={t("الدعم")}
            title={t("تواصل معنا")}
            description={t("نجيب على الأسئلة المتعلقة بالمنتجات والوصول والاستخدام.")}
          />
          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <p className="text-[13px] text-muted-foreground">{t("البريد الإلكتروني")}</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="latin mt-1 block text-[15px] font-semibold text-primary"
            >
              {SUPPORT_EMAIL}
            </a>
            <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
              {t("عنوان البريد أعلاه نموذجي وقابل للتعديل.")}
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
            toast.success(t("تم إرسال رسالتك"), { description: t("سنعود إليك قريبًا.") });
          }}
          className="space-y-5 rounded-3xl border border-border bg-card p-6 sm:p-8"
        >
          <Field label={t("الاسم")} placeholder={t("اكتب اسمك")} required autoComplete="name" />
          <Field
            label={t("البريد الإلكتروني")}
            type="email"
            placeholder="name@example.com"
            required
            autoComplete="email"
          />
          <Field label={t("الرسالة")} as="textarea" placeholder={t("كيف يمكننا مساعدتك؟")} required />
          <Button type="submit" variant="accent" size="lg" className="w-full">
            {t("إرسال الرسالة")}
          </Button>
          {sent ? (
            <p className="rounded-xl bg-accent/60 p-3.5 text-[13px] text-accent-foreground">
              {t("تم استلام رسالتك. (نموذج تجريبي — البنية جاهزة للربط بخدمة بريد لاحقًا)")}
            </p>
          ) : null}
        </form>
      </div>
    </div>
  );
}
