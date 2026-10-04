import { atom, computed } from 'nanostores';
import { persistentAtom } from '@nanostores/persistent';
import { track, toGaItem, ecommerceParams } from './analytics';

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
export const $cartItems = persistentAtom<CartItem[]>('coc-cart-v1', [], {
  encode: JSON.stringify,
  decode: JSON.parse,
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

export function addToCart(item: Omit<CartItem, 'quantity'>) {
  const items = $cartItems.get();
  const existing = items.find((i) => i.id === item.id && i.size === item.size);
  if (existing) {
    $cartItems.set(items.map((i) =>
      i.id === item.id && i.size === item.size ? { ...i, quantity: i.quantity + 1 } : i
    ));
  } else {
    $cartItems.set([...items, { ...item, quantity: 1 }]);
  }
  $cartOpen.set(true);
  // Every add (PDP, wall art) comes through here. No-op without analytics consent.
  track('add_to_cart', ecommerceParams([toGaItem({ ...item, quantity: 1 })]));
}

export function removeFromCart(id: string, size: string) {
  $cartItems.set($cartItems.get().filter((i) => !(i.id === id && i.size === size)));
}
export function clearCart() { $cartItems.set([]); }
export function toggleCart() { $cartOpen.set(!$cartOpen.get()); }
export function closeCart() { $cartOpen.set(false); }
