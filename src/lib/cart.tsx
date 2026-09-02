import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { products, type Product } from "@/data/products";

const STORAGE_KEY = "nazzim.cart.v1";

export interface CartLine {
  productId: string;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  items: { product: Product; quantity: number }[];
  count: number;
  subtotal: number;
  discount: number;
  total: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  add: (productId: string) => void;
  remove: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
}

// Keep a single context instance across HMR / duplicate module evaluations,
// otherwise consumers read a different context than the provider writes to.
const globalStore = globalThis as unknown as {
  __nazzimCartContext?: ReturnType<typeof createContext<CartContextValue | null>>;
};
const CartContext =
  globalStore.__nazzimCartContext ??
  (globalStore.__nazzimCartContext = createContext<CartContextValue | null>(null));

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
  }, [lines, hydrated]);

  const add = useCallback((productId: string) => {
    // Digital products: one licence per cart line, never incremented.
    setLines((prev) =>
      prev.some((l) => l.productId === productId) ? prev : [...prev, { productId, quantity: 1 }],
    );
    setIsOpen(true);
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
    );
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const items = lines
      .map((line) => {
        const product = products.find((p) => p.id === line.productId);
        return product ? { product, quantity: line.quantity } : null;
      })
      .filter((x): x is { product: Product; quantity: number } => x !== null);

    const listTotal = items.reduce(
      (sum, i) => sum + (i.product.compareAtPrice ?? i.product.price) * i.quantity,
      0,
    );
    const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

    return {
      lines,
      items,
      count: items.reduce((sum, i) => sum + i.quantity, 0),
      subtotal: listTotal,
      discount: Math.max(0, listTotal - total),
      total,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      add,
      remove,
      setQuantity,
      clear: () => setLines([]),
    };
  }, [lines, isOpen, add, remove, setQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
