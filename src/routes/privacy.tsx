import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/nazzim/ui";

const title = "سياسة الخصوصية | Nazzim نظّم";
const description = "كيف يتعامل Nazzim مع بياناتك عند الشراء والتواصل.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: "/privacy" },
    ],
    links: [{ rel: "canonical", href: "/privacy" }],
  }),
  component: () => (
    <LegalPage
      title="سياسة الخصوصية"
      intro="نحترم خصوصيتك ونجمع الحد الأدنى من البيانات اللازمة لإتمام الطلب وتوصيل المنتج الرقمي."
      sections={[
        {
          heading: "البيانات التي نجمعها",
          body: [
            "الاسم والبريد الإلكتروني عند إتمام الطلب أو إرسال رسالة عبر صفحة التواصل.",
            "بيانات فنية أساسية عن استخدام الموقع لتحسين التجربة.",
          ],
        },
        {
          heading: "استخدام البيانات",
          body: [
            "تُستخدم البيانات لتسليم المنتج الرقمي، والرد على الاستفسارات، وإرسال تحديثات متعلقة بالمنتج فقط.",
          ],
        },
        {
          heading: "مشاركة البيانات",
          body: ["لا نبيع بياناتك. قد نستخدم مزودي خدمة (دفع أو بريد) بالحد اللازم لتشغيل المتجر."],
        },
        {
          heading: "حقوقك",
          body: ["يمكنك طلب تعديل أو حذف بياناتك بالتواصل معنا عبر البريد الإلكتروني."],
        },
      ]}
    />
  ),
});
