/**
 * Analytics-ready event layer.
 * No tracking scripts are loaded. Events are pushed to window.dataLayer when a
 * provider is installed later; otherwise they are a no-op (logged in dev only).
 */

export type AnalyticsEvent =
  | "view_product"
  | "add_to_cart"
  | "remove_from_cart"
  | "begin_checkout"
  | "purchase"
  | "faq_open"
  | "cta_click";

type Payload = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: Payload[];
  }
}

export function track(event: AnalyticsEvent, payload: Payload = {}) {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event, ...payload });
    if (import.meta.env.DEV) console.debug("[analytics]", event, payload);
  } catch {
    /* analytics must never break the UI */
  }
}
