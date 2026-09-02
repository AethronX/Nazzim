import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/nazzim/ui";

const title = "سياسة الاسترجاع | Nazzim نظّم";
const description = "سياسة الاسترجاع للمنتجات الرقمية في متجر Nazzim.";

export const Route = createFileRoute("/refund")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: "/refund" },
    ],
    links: [{ rel: "canonical", href: "/refund" }],
  }),
  component: () => (
    <LegalPage
      title="سياسة الاسترجاع"
      intro="المنتجات في Nazzim منتجات رقمية يتم الوصول إليها مباشرة بعد الشراء، وهذا يؤثر على إمكانية الاسترجاع."
      sections={[
        {
          heading: "المبدأ العام",
          body: [
            "بعد الحصول على الوصول إلى الملف الرقمي، لا يمكن إرجاع المنتج بطبيعته. هذه هي السياسة الافتراضية للمنتجات الرقمية.",
          ],
        },
        {
          heading: "حالات المعالجة",
          body: [
            "إذا واجهت مشكلة تقنية في الوصول إلى المنتج أو استلمت ملفًا غير صحيح، تواصل معنا وسنعمل على حلها أو توفير بديل.",
          ],
        },
        {
          heading: "كيف تطلب المساعدة",
          body: [
            "أرسل رسالة عبر صفحة التواصل مع بريد الشراء ووصف المشكلة، وسنعود إليك عبر البريد الإلكتروني.",
          ],
        },
      ]}
    />
  ),
});
