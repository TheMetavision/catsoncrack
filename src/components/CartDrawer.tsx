import { useStore } from '@nanostores/react';
import { cartItems, cartOpen, cartTotal, cartCount, removeFromCart, updateQuantity, toggleCart } from '../lib/cart';

export default function CartDrawer() {
  const items = useStore(cartItems);
  const isOpen = useStore(cartOpen);
  const total = useStore(cartTotal);
  const count = useStore(cartCount);

  async function handleCheckout() {
    if (items.length === 0) return;
    try {
      const res = await fetch('/.netlify/functions/create-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map((item) => ({
          stripePriceId: item.stripePriceId, printfulVariantId: item.printfulVariantId,
          quantity: item.quantity, name: item.name, size: item.size, colour: item.colour,
        })) }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert('Checkout failed. Please try again.');
    } catch (err) { console.error('Checkout error:', err); alert('Something went wrong.'); }
  }

  const neon = '#ff00ff';
  const bg = '#1f232e';
  const bgCard = '#252a38';

  return (
    <>
      <button onClick={toggleCart} aria-label={`Cart (${count} items)`}
        style={{ position:'fixed', top:'24px', right:'24px', zIndex:200, background:neon, border:'none', borderRadius:'2px', padding:'10px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', color:'#fff', fontFamily:"'Bebas Neue', sans-serif", fontSize:'0.95rem', letterSpacing:'0.1em', boxShadow:`0 0 18px rgba(255,0,255,0.4)`, transition:'all 0.2s ease' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        {count > 0 && <span>{count}</span>}
      </button>

      {isOpen && <div onClick={toggleCart} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:998 }} />}

      <div style={{ position:'fixed', top:0, right:0, bottom:0, width:'400px', maxWidth:'90vw', background:bg, zIndex:999, transform:isOpen?'translateX(0)':'translateX(100%)', transition:'transform 0.3s ease', display:'flex', flexDirection:'column', borderLeft:`2px solid rgba(255,0,255,0.3)` }}>
        <div style={{ padding:'24px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'1.6rem', letterSpacing:'2px', color:'#fff', margin:0 }}>Your Cart</h2>
          <button onClick={toggleCart} aria-label="Close cart" style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:'1.5rem' }}>✕</button>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'16px 24px' }}>
          {items.length === 0 ? (
            <p style={{ color:'rgba(255,255,255,0.4)', textAlign:'center', padding:'48px 0' }}>Your cart is empty. Time to rep the alley.</p>
          ) : items.map((item) => (
            <div key={`${item.productId}-${item.size}-${item.colour}`} style={{ display:'flex', gap:'16px', padding:'16px 0', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              {item.image && <img src={item.image} alt={item.name} style={{ width:'64px', height:'64px', objectFit:'cover', borderRadius:'2px' }} />}
              <div style={{ flex:1 }}>
                <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:'1rem', color:'#fff', letterSpacing:'1px' }}>{item.name}</div>
                <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', marginTop:'2px' }}>{item.size}{item.colour ? ` / ${item.colour}` : ''}</div>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'8px' }}>
                  <button onClick={() => updateQuantity(item.productId, item.size, item.colour, item.quantity - 1)} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'#fff', width:'28px', height:'28px', cursor:'pointer', borderRadius:'2px' }}>−</button>
                  <span style={{ color:'#fff', fontSize:'0.9rem', minWidth:'20px', textAlign:'center' }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.productId, item.size, item.colour, item.quantity + 1)} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', color:'#fff', width:'28px', height:'28px', cursor:'pointer', borderRadius:'2px' }}>+</button>
                  <span style={{ marginLeft:'auto', color:'#fff', fontWeight:600 }}>£{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.productId, item.size, item.colour)} aria-label={`Remove ${item.name}`} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.25)', cursor:'pointer', fontSize:'1rem', alignSelf:'flex-start' }}>✕</button>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div style={{ padding:'24px', borderTop:'1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'16px', fontFamily:"'Bebas Neue', sans-serif", fontSize:'1.2rem', letterSpacing:'1px', color:'#fff' }}>
              <span>Total</span><span>£{total.toFixed(2)}</span>
            </div>
            <button onClick={handleCheckout} style={{ width:'100%', background:neon, color:'#fff', border:'none', padding:'16px', fontFamily:"'Bebas Neue', sans-serif", fontSize:'1rem', letterSpacing:'2px', cursor:'pointer', borderRadius:'2px', boxShadow:`0 0 18px rgba(255,0,255,0.4)`, transition:'all 0.2s ease' }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 0 30px rgba(255,0,255,0.6)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 0 18px rgba(255,0,255,0.4)')}>
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
