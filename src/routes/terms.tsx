import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/nazzim/ui";

const title = "الشروط والأحكام | Nazzim نظّم";
const description = "شروط استخدام موقع Nazzim وشراء الأنظمة الرقمية.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: "/terms" },
    ],
    links: [{ rel: "canonical", href: "/terms" }],
  }),
  component: () => (
    <LegalPage
      title="الشروط والأحكام"
      intro="باستخدامك موقع Nazzim وشراء منتجاته الرقمية، فإنك توافق على الشروط التالية."
      sections={[
        {
          heading: "طبيعة المنتجات",
          body: [
            "جميع المنتجات رقمية وتعمل داخل Google Sheets، ويتم الوصول إليها بعد إتمام الشراء.",
          ],
        },
        {
          heading: "الاستخدام المسموح",
          body: [
            "الترخيص للاستخدام الشخصي. لا يجوز إعادة بيع المنتج أو توزيعه أو نشره دون إذن مكتوب.",
          ],
        },
        {
          heading: "التحديثات",
          body: ["قد نحدّث الأنظمة أو محتوى الموقع، ويسري التحديث من تاريخ نشره."],
        },
        {
          heading: "المسؤولية",
          body: [
            "الأنظمة أدوات تنظيم؛ النتائج تعتمد على استخدامك الشخصي. لا نقدّم أي ادعاءات أداء غير موثقة.",
          ],
        },
      ]}
    />
  ),
});
