import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { Product } from "@/data/products";
import { getPaddleConfig } from "./payments.functions";

export interface PaddleConfig {
  enabled: boolean;
  clientToken: string | null;
  environment: "sandbox" | "production";
}

const disabled: PaddleConfig = { enabled: false, clientToken: null, environment: "sandbox" };

/**
 * Runtime payment readiness. Nothing in the purchase path should render an
 * active payment CTA while this returns `ready === false`.
 */
export function usePaddleConfig() {
  const fetchConfig = useServerFn(getPaddleConfig);
  const { data, isPending } = useQuery({
    queryKey: ["paddle-config"],
    queryFn: () => fetchConfig(),
    staleTime: 5 * 60 * 1000,
  });
  const config = (data as PaddleConfig | undefined) ?? disabled;
  return { config, loading: isPending };
}

/** A product can only be sold once Paddle is configured AND it has a Paddle price id. */
export function isPurchasable(product: Product, config: PaddleConfig) {
  return config.enabled && Boolean(product.paddlePriceId);
}

/** Cart is checkout-ready only when every line maps to a real Paddle price. */
export function cartCheckoutReady(
  items: { product: Product; quantity: number }[],
  config: PaddleConfig,
) {
  return config.enabled && items.length > 0 && items.every((i) => Boolean(i.product.paddlePriceId));
}

export function paddleLineItems(items: { product: Product; quantity: number }[]) {
  return items
    .filter((i) => i.product.paddlePriceId)
    .map((i) => ({ priceId: i.product.paddlePriceId as string, quantity: i.quantity }));
}
