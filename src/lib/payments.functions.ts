import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { products } from "@/data/products";

/**
 * Payment configuration is read from the server at runtime (never from
 * `import.meta.env`), so filling the environment variables activates checkout
 * WITHOUT a rebuild.
 *
 * Required to activate payments:
 *   PADDLE_CLIENT_TOKEN     (Paddle > Developer tools > Authentication)
 *   PADDLE_ENVIRONMENT      "sandbox" | "production"  (defaults to sandbox)
 */
export const getPaddleConfig = createServerFn({ method: "GET" }).handler(async () => {
  const clientToken = (process.env["PADDLE_CLIENT_TOKEN"] ?? "").trim();
  const environment =
    (process.env["PADDLE_ENVIRONMENT"] ?? "").trim() === "production" ? "production" : "sandbox";

  return {
    enabled: clientToken.length > 0,
    clientToken: clientToken || null,
    environment: environment as "sandbox" | "production",
  };
});

/** Order status for the /success page. Reads with the service role — client tables are locked. */
export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ transactionId: z.string().min(3).max(200) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, status, email, currency, total_amount, delivery_email_sent_at")
      .eq("paddle_transaction_id", data.transactionId)
      .maybeSingle();

    if (!order) return { found: false as const };

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_id, product_name, unit_price, quantity")
      .eq("order_id", order.id);

    const { data: links } = await supabaseAdmin
      .from("product_delivery")
      .select("product_id, sheet_url");

    const linkFor = (productId: string) =>
      links?.find((l) => l.product_id === productId)?.sheet_url ?? null;

    return {
      found: true as const,
      status: order.status,
      email: order.email,
      emailSent: Boolean(order.delivery_email_sent_at),
      items: (items ?? []).map((i) => ({
        productId: i.product_id,
        name: products.find((p) => p.id === i.product_id)?.arabicName ?? i.product_name,
        sheetUrl: linkFor(i.product_id),
      })),
    };
  });
