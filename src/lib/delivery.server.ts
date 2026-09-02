/**
 * Order delivery email (Resend). Server-only.
 *
 * Env vars (leave empty until you have them — nothing breaks, we just log):
 *   RESEND_API_KEY
 *   ORDER_FROM_EMAIL   e.g. "Nazzim <orders@yourdomain.com>"
 */

export interface DeliveryLine {
  productName: string;
  sheetUrl: string | null;
}

const CONTACT_URL = "https://www.nazzim.co/contact";

export function buildDeliveryEmail(lines: DeliveryLine[]) {
  const missing = lines.some((l) => !l.sheetUrl);

  const rows = lines
    .map(
      (l) => `
      <tr>
        <td style="padding:14px 18px;border-bottom:1px solid #e9e7f3;font-size:15px;color:#1a1730;font-weight:700">
          ${escapeHtml(l.productName)}
        </td>
        <td style="padding:14px 18px;border-bottom:1px solid #e9e7f3;text-align:left">
          ${
            l.sheetUrl
              ? `<a href="${escapeHtml(l.sheetUrl)}" style="background:#6d3bef;color:#fff;text-decoration:none;padding:9px 16px;border-radius:10px;font-size:14px;font-weight:700;display:inline-block">فتح الملف</a>`
              : `<span style="font-size:13px;color:#6b6785">سيصلك الرابط خلال وقت قصير</span>`
          }
        </td>
      </tr>`,
    )
    .join("");

  const subject = missing
    ? "طلبك في نظّم — الروابط في الطريق إليك"
    : "طلبك جاهز — روابط ملفاتك من نظّم";

  const html = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8" /><title>${subject}</title></head>
<body style="margin:0;background:#f6f5fb;font-family:'Tajawal',Segoe UI,Arial,sans-serif;direction:rtl;text-align:right">
  <div style="max-width:560px;margin:0 auto;padding:28px 18px">
    <p style="font-size:22px;font-weight:800;color:#1a1730;letter-spacing:-.5px;margin:0 0 20px">Nazzim · نظّم</p>
    <div style="background:#fff;border:1px solid #e9e7f3;border-radius:20px;padding:26px">
      <h1 style="margin:0 0 10px;font-size:20px;color:#1a1730">شكراً لثقتك بنا 🤍</h1>
      <p style="margin:0 0 18px;font-size:15px;line-height:1.9;color:#4a4663">
        تم تأكيد دفعك بنجاح. هذه ملفاتك:
      </p>
      <table style="width:100%;border-collapse:collapse;border:1px solid #e9e7f3;border-radius:14px;overflow:hidden">${rows}</table>
      ${
        missing
          ? `<p style="margin:18px 0 0;font-size:14px;line-height:1.9;color:#4a4663;background:#f6f5fb;border-radius:12px;padding:14px">
              بعض الروابط قيد التحضير وسنرسلها لك على هذا البريد خلال وقت قصير. طلبك محفوظ ومؤكد.
             </p>`
          : ""
      }
      <h2 style="margin:24px 0 8px;font-size:16px;color:#1a1730">كيف تبدأ؟</h2>
      <ol style="margin:0;padding-inline-start:20px;font-size:14px;line-height:2;color:#4a4663">
        <li>افتح الرابط أعلاه.</li>
        <li>من قائمة «ملف» (File) اختر «إنشاء نسخة» (Make a copy).</li>
        <li>تصبح النسخة ملكك بالكامل — عدّلها كما تشاء وابدأ أول يوم اليوم.</li>
      </ol>
      <p style="margin:22px 0 0;font-size:13.5px;line-height:1.9;color:#6b6785">
        واجهت مشكلة في الوصول؟ <a href="${CONTACT_URL}" style="color:#6d3bef;font-weight:700">راسلنا من هنا</a> وسنحلها فوراً.
      </p>
    </div>
    <p style="margin:16px 0 0;text-align:center;font-size:12px;color:#8b87a3">Nazzim · أنظمة رقمية تعمل داخل Google Sheets</p>
  </div>
</body></html>`;

  return { subject, html, missing };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Sends the delivery email. Returns false (and logs) when Resend is not
 * configured yet, so the webhook still stores the order successfully.
 */
export async function sendDeliveryEmail(to: string, lines: DeliveryLine[]) {
  const apiKey = (process.env["RESEND_API_KEY"] ?? "").trim();
  const from = (process.env["ORDER_FROM_EMAIL"] ?? "").trim();

  const { subject, html, missing } = buildDeliveryEmail(lines);
  if (missing) {
    console.warn("[delivery] missing sheet_url for one or more products", { to });
  }

  if (!apiKey || !from) {
    console.warn("[delivery] email skipped — RESEND_API_KEY / ORDER_FROM_EMAIL not set", { to });
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    console.error("[delivery] resend failed", res.status, await res.text());
    return false;
  }
  return true;
}
