/**
 * src/lib/cart.ts
 *
 * Cart state management using nanostores.
 * Identical pattern across all IP brands.
 *
 * Usage from Astro pages:
 *   window.dispatchEvent(new CustomEvent('add-to-cart', { detail: { id, title, price, size, colour, image, productType } }));
 *
 * Usage from React components:
 *   import { addToCart, $cartItems, $cartOpen } from '../lib/cart';
 */

import { atom, computed } from 'nanostores';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  size: string;
  colour?: string;
  image: string;
  productType?: string;
  quantity: number;
}

export const $cartItems = atom<CartItem[]>([]);
export const $cartOpen = atom(false);

export const $cartTotal = computed($cartItems, (items) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

export const $cartCount = computed($cartItems, (items) =>
  items.reduce((sum, item) => sum + item.quantity, 0)
);

export function addToCart(item: Omit<CartItem, 'quantity'>) {
  const items = $cartItems.get();
  const existing = items.find((i) => i.id === item.id && i.size === item.size);

  if (existing) {
    $cartItems.set(
      items.map((i) =>
        i.id === item.id && i.size === item.size
          ? { ...i, quantity: i.quantity + 1 }
          : i
      )
    );
  } else {
    $cartItems.set([...items, { ...item, quantity: 1 }]);
  }

  $cartOpen.set(true);
}

export function removeFromCart(id: string, size: string) {
  $cartItems.set($cartItems.get().filter((i) => !(i.id === id && i.size === size)));
}

export function clearCart() {
  $cartItems.set([]);
}

export function toggleCart() {
  $cartOpen.set(!$cartOpen.get());
}
