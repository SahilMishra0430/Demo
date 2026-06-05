import React from 'react';
import { useCart } from '../context/CartContext';

const Cart = ({ onCheckout }) => {
  const { items, isOpen, closeCart, increaseQty, decreaseQty, removeItem, totalAmount, totalItems } = useCart();

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 fade-in" onClick={closeCart} />
      <div
        className="fixed right-0 top-0 h-full w-full max-w-sm z-50 flex flex-col shadow-2xl slide-in"
        style={{ background: '#ffffff' }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary) 100%)' }}
        >
          <div>
            <h2 className="font-black text-lg tracking-wide text-white" style={{ fontFamily: 'Playfair Display,serif' }}>
              Your Order
            </h2>
            <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--accent)', fontFamily: 'Poppins,sans-serif' }}>
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={closeCart}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors"
            style={{ background: 'rgba(214,153,60,0.2)', border: '1px solid rgba(214,153,60,0.3)' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(50,88,98,0.1)' }}>
                <svg viewBox="0 0 24 24" className="w-8 h-8" style={{ fill: 'var(--admin)', opacity: 0.5 }}>
                  <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96C5 16.1 6.1 17 7 17h11v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21 5H5.21l-.67-3H1z" />
                </svg>
              </div>
              <p className="font-bold text-gray-700" style={{ fontFamily: 'Playfair Display,serif' }}>Your cart is empty</p>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)', fontFamily: 'Poppins,sans-serif' }}>Add items from the menu</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.cartKey}
                className="rounded-xl p-3 flex gap-3"
                style={{ background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(50,88,98,0.61)' }}
              >
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className={item.veg ? 'veg-icon' : 'nonveg-icon'} />
                      <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-body)', fontFamily: 'Poppins,sans-serif' }}>
                        {item.name}
                      </p>
                      {item.selectedSize && (
                        <span
                          className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                          style={{
                            background: item.selectedSize === 'half' ? 'rgba(214,153,60,0.2)' : 'rgba(50,88,98,0.15)',
                            color:      item.selectedSize === 'half' ? 'var(--accent-dark)' : 'var(--admin)',
                          }}
                        >
                          {item.selectedSize === 'half' ? 'Half' : 'Full'}
                        </span>
                      )}
                    </div>
                    <button onClick={() => removeItem(item.cartKey)} className="text-red-700 hover:text-red-600 transition-colors flex-shrink-0">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                      </svg>
                    </button>
                  </div>

                  <p className="text-xs mt-0.5" style={{ color: 'var(--ordermodelbgtextonsummery)', fontFamily: 'Poppins,sans-serif' }}>
                    ₹{item.price} each
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5 rounded-full px-1 py-0.5" style={{ background: 'var(--primary-deep)' }}>
                      <button onClick={() => decreaseQty(item.cartKey)} className="w-6 h-6 rounded-full bg-white font-black flex items-center justify-center text-sm active:scale-90" style={{ color: 'var(--admin)' }}>−</button>
                      <span className="text-white font-bold text-sm min-w-[20px] text-center" style={{ fontFamily: 'Poppins,sans-serif' }}>{item.quantity}</span>
                      <button onClick={() => increaseQty(item.cartKey)} className="w-6 h-6 rounded-full bg-white font-black flex items-center justify-center text-sm active:scale-90" style={{ color: 'var(--admin)' }}>+</button>
                    </div>
                    <span className="font-black text-sm" style={{ color: 'var(--text-price)', fontFamily: 'Poppins,sans-serif' }}>
                      ₹{item.price * item.quantity}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-5 py-4 space-y-3" style={{ background: 'white', borderTop: '1px solid rgba(214,153,60,0.2)' }}>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm" style={{ color: 'var(--primary)', fontFamily: 'Poppins,sans-serif' }}>Subtotal</span>
              <span className="font-black text-lg" style={{ color: 'var(--text-price)', fontFamily: 'Poppins,sans-serif' }}>₹{totalAmount}</span>
            </div>
            <button onClick={() => { closeCart(); onCheckout(); }} className="btn w-full py-3.5 rounded-2xl text-sm tracking-widest uppercase" style={{ background: 'var(--confirmbuttonbg)', color: 'var(--ordermodelbgtext)' }}>
              Place Order →
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
