import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { apiError } from "../api/client";
import { quoteSale, type Quote } from "../api/pos";

export type CartLine = { kind: "product" | "bundle"; key: string; name: string; quantity: number };

type Cart = {
  location: string;
  setLocation: (name: string) => void;
  lines: CartLine[];
  count: number;
  add: (kind: CartLine["kind"], key: string, name: string) => void;
  setQuantity: (line: CartLine, quantity: number) => void;
  clear: () => void;
  quote: Quote | null;
  quoting: boolean;
  quoteError: string | null;
  /** Price for one cart line, summed across the batches it was drawn from. */
  priceOf: (line: CartLine) => { total: number; unit: number } | null;
  payload: { barcode?: string; bundle?: string; quantity: number }[];
};

const CartContext = createContext<Cart | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  // Each result remembers the cart it priced, so stale quotes are never shown.
  const [result, setResult] = useState<{ key: string; quote: Quote | null; error: string | null } | null>(null);

  const payload = useMemo(
    () => lines.map((line) => (line.kind === "product" ? { barcode: line.key, quantity: line.quantity } : { bundle: line.key, quantity: line.quantity })),
    [lines],
  );

  const cartKey = payload.length === 0 || !location ? "" : JSON.stringify([location, payload]);

  useEffect(() => {
    if (!cartKey) {
      return;
    }
    let active = true;
    const handle = setTimeout(() => {
      quoteSale(location, payload)
        .then((response) => active && setResult({ key: cartKey, quote: response.data, error: null }))
        .catch((err) => active && setResult({ key: cartKey, quote: null, error: apiError(err) }));
    }, 250);
    return () => {
      active = false;
      clearTimeout(handle);
    };
  }, [cartKey, location, payload]);

  const current = cartKey && result?.key === cartKey ? result : null;
  const quote = current?.quote ?? null;
  const quoteError = current?.error ?? null;
  const quoting = cartKey !== "" && current === null;

  const add = useCallback((kind: CartLine["kind"], key: string, name: string) => {
    setLines((current) => {
      const existing = current.find((line) => line.kind === kind && line.key === key);
      if (existing) {
        return current.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [{ kind, key, name, quantity: 1 }, ...current];
    });
  }, []);

  const setQuantity = useCallback((target: CartLine, quantity: number) => {
    setLines((current) =>
      current
        .map((line) => (line.kind === target.kind && line.key === target.key ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const priceOf = useCallback(
    (line: CartLine) => {
      if (!quote) {
        return null;
      }
      const matches = quote.lines.filter((row) =>
        line.kind === "product" ? row.kind === "product" && row.barcode === line.key : row.kind === "bundle" && row.name === line.key,
      );
      if (matches.length === 0) {
        return null;
      }
      const total = matches.reduce((sum, row) => sum + Number(row.line_total), 0);
      return { total, unit: total / line.quantity };
    },
    [quote],
  );

  const value = useMemo<Cart>(
    () => ({
      location,
      setLocation,
      lines,
      count: lines.reduce((sum, line) => sum + line.quantity, 0),
      add,
      setQuantity,
      clear,
      quote,
      quoting,
      quoteError,
      priceOf,
      payload,
    }),
    [location, lines, add, setQuantity, clear, quote, quoting, quoteError, priceOf, payload],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return cart;
}
