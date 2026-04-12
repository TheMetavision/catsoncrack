/**
 * src/components/CartDrawer.tsx
 * Cats On Crack — Cart drawer component
 *
 * Brand palette: bg #181B22, accent #FF00FF (magenta), amber #FF8C00, text #F0EDE8
 */

import { useStore } from '@nanostores/react';
import { useEffect } from 'react';
import { $cartItems, $cartOpen, $cartTotal, $cartCount, removeFromCart, toggleCart, addToCart } from '../lib/cart';

export default function CartDrawer() {
  const items = useStore($cartItems);
  const isOpen = useStore($cartOpen);
  const total = useStore($cartTotal);
  const count = useStore($cartCount);

  useEffect(() => {
    function handleAdd(e: any) { addToCart(e.detail); }
    window.addEventListener('add-to-cart', handleAdd);
    return () => window.removeEventListener('add-to-cart', handleAdd);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  async function handleCheckout() {
    if (items.length === 0) return;
    try {
      const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            title: item.title,
            price: item.price,
            size: item.size,
            colour: item.colour || '',
            image: item.image,
            productType: item.productType || '',
            quantity: item.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(`Checkout failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Something went wrong. Please try again.');
    }
  }

  const accent = '#FF00FF';
  const accentDim = '#cc00cc';
  const bg = '#181B22';
  const bgLight = '#1f2330';
  const text = '#F0EDE8';
  const textMuted = '#8a8880';

  const styles: Record<string, React.CSSProperties> = {
    overlay: {
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 2000, opacity: isOpen ? 1 : 0,
      pointerEvents: isOpen ? 'all' : 'none',
      transition: 'opacity 0.3s',
    },
    drawer: {
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: '400px', maxWidth: '90vw', background: bg,
      borderLeft: `2px solid ${accent}33`,
      zIndex: 2001,
      transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.3s ease',
      display: 'flex', flexDirection: 'column',
    },
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '20px 24px', borderBottom: `1px solid ${accent}22`,
    },
    title: {
      color: accent, fontSize: '18px', fontWeight: 700,
      letterSpacing: '2px', textTransform: 'uppercase' as const, margin: 0,
    },
    closeBtn: {
      background: 'none', border: 'none', color: text,
      fontSize: '28px', cursor: 'pointer', padding: '0 4px',
      lineHeight: 1,
    },
    body: {
      flex: 1, overflowY: 'auto' as const, padding: '16px 24px',
    },
    empty: {
      color: textMuted, textAlign: 'center' as const,
      padding: '48px 0', fontSize: '14px',
    },
    item: {
      display: 'flex', gap: '14px', padding: '14px 0',
      borderBottom: `1px solid ${accent}11`,
    },
    itemImg: {
      width: '72px', height: '72px', objectFit: 'cover' as const,
      borderRadius: '6px', border: `1px solid ${accent}22`,
    },
    itemName: {
      color: text, fontSize: '14px', fontWeight: 600, margin: '0 0 4px',
    },
    itemVariant: {
      color: textMuted, fontSize: '12px', margin: '0 0 4px',
    },
    itemPrice: {
      color: accent, fontSize: '14px', fontWeight: 700, margin: '0 0 6px',
    },
    removeBtn: {
      background: 'none', border: 'none', color: '#ff4466',
      fontSize: '12px', cursor: 'pointer', padding: 0,
      textDecoration: 'underline',
    },
    footer: {
      padding: '20px 24px', borderTop: `1px solid ${accent}22`,
    },
    totalRow: {
      display: 'flex', justifyContent: 'space-between',
      marginBottom: '16px',
    },
    totalLabel: {
      color: text, fontSize: '16px', fontWeight: 600,
      textTransform: 'uppercase' as const, letterSpacing: '1px',
    },
    totalValue: {
      color: accent, fontSize: '20px', fontWeight: 700,
    },
    checkoutBtn: {
      width: '100%', padding: '14px', background: accent, color: '#000',
      border: 'none', fontSize: '16px', fontWeight: 700,
      textTransform: 'uppercase' as const, letterSpacing: '2px',
      cursor: 'pointer', borderRadius: '4px',
      transition: 'background 0.2s',
    },
  };

  return (
    <>
      <div style={styles.overlay} onClick={toggleCart} />
      <div style={styles.drawer}>
        <div style={styles.header}>
          <h2 style={styles.title}>Cart ({count})</h2>
          <button style={styles.closeBtn} onClick={toggleCart}>&times;</button>
        </div>
        <div style={styles.body}>
          {items.length === 0 ? (
            <p style={styles.empty}>Your cart is empty. Hit the streets and grab some gear.</p>
          ) : (
            items.map((item) => (
              <div style={styles.item} key={item.id + '-' + item.size}>
                <img style={styles.itemImg} src={item.image} alt={item.title} />
                <div>
                  <p style={styles.itemName}>{item.title}</p>
                  <p style={styles.itemVariant}>
                    {item.colour ? `${item.colour} · ` : ''}Size: {item.size} · Qty: {item.quantity}
                  </p>
                  <p style={styles.itemPrice}>&pound;{(item.price * item.quantity).toFixed(2)}</p>
                  <button style={styles.removeBtn} onClick={() => removeFromCart(item.id, item.size)}>
                    Remove
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        {items.length > 0 && (
          <div style={styles.footer}>
            <div style={styles.totalRow}>
              <span style={styles.totalLabel}>Total</span>
              <span style={styles.totalValue}>&pound;{total.toFixed(2)}</span>
            </div>
            <button
              style={styles.checkoutBtn}
              onClick={handleCheckout}
              onMouseEnter={(e) => (e.currentTarget.style.background = accentDim)}
              onMouseLeave={(e) => (e.currentTarget.style.background = accent)}
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
