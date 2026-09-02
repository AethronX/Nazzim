import { createFileRoute } from "@tanstack/react-router";
import { products } from "@/data/products";
import { sendDeliveryEmail, type DeliveryLine } from "@/lib/delivery.server";

/**
 * Paddle webhook — the ONLY source of truth for a completed payment.
 * Configure this URL in Paddle > Developer tools > Notifications:
 *   https://<your-domain>/api/public/paddle-webhook
 * Secret goes into PADDLE_WEBHOOK_SECRET.
 */
export const Route = createFileRoute("/api/public/paddle-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = (process.env["PADDLE_WEBHOOK_SECRET"] ?? "").trim();
        if (!secret) {
          console.error("[paddle-webhook] PADDLE_WEBHOOK_SECRET not configured");
          return new Response("Not configured", { status: 503 });
        }

        const raw = await request.text();
        const signature = request.headers.get("paddle-signature") ?? "";
        if (!(await verifyPaddleSignature(raw, signature, secret))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let event: PaddleEvent;
        try {
          event = JSON.parse(raw) as PaddleEvent;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        if (event.event_type !== "transaction.completed") {
          return new Response("ignored", { status: 200 });
        }

        const txn = event.data;
        if (!txn?.id) return new Response("Missing transaction id", { status: 400 });

        const email =
          txn.customer?.email ?? txn.details?.customer?.email ?? txn.custom_data?.email ?? null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: an existing row means we already stored + emailed this transaction.
        const { data: existing } = await supabaseAdmin
          .from("orders")
          .select("id, delivery_email_sent_at")
          .eq("paddle_transaction_id", txn.id)
          .maybeSingle();

        if (existing) return new Response("already processed", { status: 200 });

        const lines = (txn.items ?? []).map((item) => {
          const priceId = item.price?.id ?? item.price_id ?? "";
          const product = products.find((p) => p.paddlePriceId === priceId);
          const unitAmount = Number(item.price?.unit_price?.amount ?? 0) / 100;
          return {
            product_id: product?.id ?? priceId,
            product_name: product?.name ?? item.price?.name ?? priceId,
            unit_price: product?.price ?? unitAmount,
            quantity: item.quantity ?? 1,
          };
        });

        const currency = txn.currency_code ?? "USD";
        const total = Number(txn.details?.totals?.total ?? 0) / 100;

        const { data: order, error: orderError } = await supabaseAdmin
          .from("orders")
          .insert({
            paddle_transaction_id: txn.id,
            email: email ?? "unknown@unknown.invalid",
            status: "completed",
            currency,
            total_amount: total,
          })
          .select("id")
          .single();

        if (orderError || !order) {
          // Unique violation = a concurrent delivery already handled it.
          if (orderError?.code === "23505")
            return new Response("already processed", { status: 200 });
          console.error("[paddle-webhook] failed to store order", orderError);
          return new Response("Storage error", { status: 500 });
        }

        if (lines.length) {
          const { error: itemsError } = await supabaseAdmin
            .from("order_items")
            .insert(lines.map((l) => ({ ...l, order_id: order.id })));
          if (itemsError) console.error("[paddle-webhook] failed to store items", itemsError);
        }

        if (email) {
          const { data: links } = await supabaseAdmin
            .from("product_delivery")
            .select("product_id, sheet_url");

          const deliveryLines: DeliveryLine[] = lines.map((l) => ({
            productName: products.find((p) => p.id === l.product_id)?.arabicName ?? l.product_name,
            sheetUrl: links?.find((x) => x.product_id === l.product_id)?.sheet_url ?? null,
          }));

          const sent = await sendDeliveryEmail(email, deliveryLines);
          if (sent) {
            await supabaseAdmin
              .from("orders")
              .update({ delivery_email_sent_at: new Date().toISOString() })
              .eq("id", order.id);
          }
        } else {
          console.warn("[paddle-webhook] no customer email on transaction", txn.id);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});

interface PaddleEvent {
  event_type?: string;
  data?: {
    id?: string;
    currency_code?: string;
    customer?: { email?: string };
    custom_data?: { email?: string };
    details?: { totals?: { total?: string }; customer?: { email?: string } };
    items?: {
      quantity?: number;
      price_id?: string;
      price?: { id?: string; name?: string; unit_price?: { amount?: string } };
    }[];
  };
}

/** Paddle-Signature: `ts=<unix>;h1=<hmac-sha256 of "ts:body">`. */
async function verifyPaddleSignature(body: string, header: string, secret: string) {
  const parts = header.split(";").reduce<Record<string, string>>((acc, part) => {
    const [k, v] = part.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) return false;

  // Reject stale signatures (5 minute window) to blunt replay attempts.
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${body}`));
  const expected = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");

  if (expected.length !== h1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ h1.charCodeAt(i);
  return diff === 0;
}
