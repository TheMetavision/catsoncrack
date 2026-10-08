import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { track, toGaItem, ecommerceParams } from './analytics';
import { addLine, setLineQty, sanitizeStoredCart, MAX_QTY_PER_LINE } from './cart-quantity';

export { MAX_QTY_PER_LINE };

export interface CartItem {
  id: string;        // POD: product-{slug}-{type}-{colour}-{size}  ·  wall art: wallart-{slug}-{format}-{size}
  slug?: string;     // product / artwork slug (GA4 item_id); missing on carts saved before it was added
  title: string;
  price: number;     // per-size price, already resolved on the PDP (server re-prices wall art)
  size: string;
  colour?: string;
  format?: string;   // wall art only: format id (poster | canvas-standard | canvas-gallery)
  image: string;
  productType?: string;
  quantity: number;
  stripePriceId?: string; // vestigial; checkout uses ad-hoc price_data
}

// CONFIRM for COC: Wyrmfuel uses £75. Set to your desired free-postage threshold.
export const FREE_SHIPPING_THRESHOLD = 75;

// New persist key so a stale Wyrmfuel/flat cart can't leak in.
// Key and stored shape unchanged by quantity controls; decoding only repairs
// or drops entries that could never check out (see sanitizeStoredCart).
export const $cartItems = persistentAtom<CartItem[]>('coc-cart-v1', [], {
  encode: JSON.stringify,
  decode: (raw) => {
    try {
      return sanitizeStoredCart(JSON.parse(raw)) as CartItem[];
    } catch {
      return [];
    }
  },
});

export const $cartOpen = atom(false);

export const $cartTotal = computed($cartItems, (items) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0)
);
export const $cartCount = computed($cartItems, (items) =>
  items.reduce((sum, item) => sum + item.quantity, 0)
);
export const $qualifiesForFreeShipping = computed($cartTotal, (t) => t >= FREE_SHIPPING_THRESHOLD);
export const $amountToFreeShipping = computed($cartTotal, (t) => Math.max(0, FREE_SHIPPING_THRESHOLD - t));

/**
 * Add `quantity` (default 1) of an item. The same variant merges into one
 * line, capped at MAX_QTY_PER_LINE. Returns how many were actually added.
 */
export function addToCart(item: Omit<CartItem, 'quantity'>, quantity: unknown = 1): number {
  const { items, added } = addLine($cartItems.get(), item, quantity);
  if (added > 0) $cartItems.set(items);
  $cartOpen.set(true);
  // Every add (PDP, wall art) comes through here. No-op without analytics consent.
  if (added > 0) track('add_to_cart', ecommerceParams([toGaItem({ ...item, quantity: added })]));
  return added;
}

/** Set a line's quantity from the drawer's − / + controls. Below 1 removes it. */
export function setQuantity(id: string, size: string, quantity: number) {
  const before = $cartItems.get();
  const line = before.find((i) => i.id === id && i.size === size);
  const after = setLineQty(before, id, size, quantity);
  if (after === before) return;
  $cartItems.set(after);
  const now = after.find((i) => i.id === id && i.size === size);
  if (line && now && now.quantity > line.quantity) {
    track('add_to_cart', ecommerceParams([toGaItem({ ...now, quantity: now.quantity - line.quantity })]));
  }
}

export function removeFromCart(id: string, size: string) {
  $cartItems.set($cartItems.get().filter((i) => !(i.id === id && i.size === size)));
}
export function clearCart() { $cartItems.set([]); }
export function toggleCart() { $cartOpen.set(!$cartOpen.get()); }
export function closeCart() { $cartOpen.set(false); }
