# Nazzim — Payments & Delivery Setup

The store ships fully wired to **Paddle Billing** (overlay checkout) + **Resend**
(delivery email). Nothing is mocked. Until the environment variables below are
filled, the site shows a clear "المتجر قيد الإعداد — الدفع غير مفعّل حاليًا"
state and every payment CTA is disabled — it never pretends to accept money.

The Paddle client token is read on the **server at request time**, so filling the
variables activates checkout **without a rebuild** (a page refresh is enough).

---

## 1. Environment variables

Add these in **Project Settings → Secrets**:

| Variable | Where to get it | Required for |
| --- | --- | --- |
| `PADDLE_CLIENT_TOKEN` | Paddle → Developer tools → Authentication → Client-side tokens | Activating checkout |
| `PADDLE_ENVIRONMENT` | `sandbox` while testing, `production` when live (defaults to `sandbox`) | Choosing Paddle env |
| `PADDLE_WEBHOOK_SECRET` | Paddle → Developer tools → Notifications → your destination → Secret key | Verifying webhooks |
| `RESEND_API_KEY` | Resend → API Keys | Sending delivery email |
| `ORDER_FROM_EMAIL` | A verified sender, e.g. `Nazzim <orders@yourdomain.com>` | Sending delivery email |

Payments only turn on when `PADDLE_CLIENT_TOKEN` is set **and** the product has a
`paddlePriceId` (step 3).

## 2. Create products & prices in Paddle

1. Paddle → Catalogue → **Products** → create one product per Nazzim system
   (Habit Tracker, Tasks & Goals, Nazzim Complete System).
2. For each product create a **one-time price** in USD matching `src/data/products.ts`
   (`$9`, `$9`, `$13.50`).
3. Copy each price id (`pri_...`).

## 3. Paste the price ids into the catalogue

`src/data/products.ts` — one line per product:

```ts
{
  id: "habit-tracker",
  // ...
  paddlePriceId: "pri_01hxxxxxxxxxxxxxxxxxxxxxxx",
}
```

Products without a `paddlePriceId` stay unbuyable by design.

## 4. Configure the webhook

Paddle → Developer tools → **Notifications** → New destination:

- URL: `https://<your-domain>/api/public/paddle-webhook`
  (production: `https://nazzim.co/api/public/paddle-webhook`)
- Event: **`transaction.completed`** (others are ignored safely)
- Copy the destination's secret key into `PADDLE_WEBHOOK_SECRET`

The webhook is the single source of truth: it verifies the `Paddle-Signature`
header (HMAC-SHA256 over `ts:body`, 5-minute freshness window), rejects unsigned
requests, is idempotent per `paddle_transaction_id`, stores the order and its
items, then sends the delivery email once.

## 5. Fill the Google Sheets delivery links

Table `product_delivery` has one row per product (`product_id`, `sheet_url`).
Set `sheet_url` to the **share link of the master sheet** (viewer access — the
buyer makes their own copy). Until a link is filled, buyers get an email saying
the link is on its way, and it is logged server-side. No broken/fake links are
ever sent.

## 6. Test end to end

1. Set `PADDLE_ENVIRONMENT=sandbox` and use sandbox tokens/prices.
2. Buy a product; Paddle's overlay handles the payment methods.
3. Paddle returns to `/success?_ptxn=txn_...`; that page reads the real order
   status from the database and shows the links once the webhook confirms.
4. Verify a row in `orders` + `order_items`, and the email in Resend logs.
5. Switch tokens and `PADDLE_ENVIRONMENT=production` to go live.

## Data model

- `orders` — `paddle_transaction_id` (unique), `email`, `status`, `currency`,
  `total_amount`, `delivery_email_sent_at`, `created_at`
- `order_items` — `order_id` → orders, `product_id`, `product_name`,
  `unit_price`, `quantity`
- `product_delivery` — `product_id` (unique), `sheet_url`

All three are locked to the client (RLS enabled + restrictive deny-all policy);
only trusted server code reaches them with the service role.
