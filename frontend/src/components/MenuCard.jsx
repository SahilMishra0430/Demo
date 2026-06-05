import React, { useState } from 'react';
import { useCart } from '../context/CartContext';

const FALLBACK = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&auto=format&fit=crop';

const MenuCard = ({ item }) => {
  const { items, addItem, increaseQty, decreaseQty } = useCart();
  const [imgErr, setImgErr] = useState(false);

  const hasHalf     = item.halfPrice != null && item.halfPrice !== '';
  const hasFull     = item.fullPrice != null && item.fullPrice !== '';
  const hasVariants = hasHalf || hasFull;

  const [selectedSize, setSelectedSize] = useState(hasFull ? 'full' : hasHalf ? 'half' : '');

  const cartKey    = hasVariants ? `${item._id}_${selectedSize}` : String(item._id);
  const price      = hasVariants ? (selectedSize === 'half' ? item.halfPrice : item.fullPrice) : item.price;
  const description = hasVariants
    ? (selectedSize === 'half' ? (item.halfDescription || item.description || '') : (item.fullDescription || item.description || ''))
    : (item.description || '');

  const cartItem = items.find((i) => i.cartKey === cartKey);
  const qty      = cartItem?.quantity || 0;

  const handleAdd = () => addItem({ ...item, cartKey, price, selectedSize: hasVariants ? selectedSize : '' });

  return (
    <div
      className={`menu-card rounded-2xl overflow-hidden flex flex-col ${!item.available ? 'opacity-50 pointer-events-none' : ''}`}
      style={{ background: 'var(--card-bg)', border: '1px solid rgba(214,153,60,0.18)', boxShadow: '0 2px 12px rgba(50,88,98,0.07)' }}
    >
      {/* Image */}
      <div className="relative h-32 overflow-hidden" style={{ background: 'var(--image-bg)' }}>
        <img
          src={imgErr ? FALLBACK : (item.image || FALLBACK)}
          alt={item.name}
          onError={() => setImgErr(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 hover:scale-108"
          loading="lazy"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(36,63,71,0.35) 0%, transparent 60%)' }} />
        <div className="absolute top-2 left-2 bg-white/90 rounded-md p-0.5 shadow-sm">
          {item.veg ? <div className="veg-icon" /> : <div className="nonveg-icon" />}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-semibold text-sm leading-tight line-clamp-1 mb-0.5" style={{ fontFamily: 'Poppins,sans-serif', color: 'var(--text-body)' }}>
          {item.name}
        </h3>

        {description && (
          <p className="text-[11px] leading-relaxed line-clamp-2 mb-1.5" style={{ color: 'var(--text-desc)', fontFamily: 'Poppins,sans-serif' }}>
            {description}
          </p>
        )}

        {/* Half / Full selector */}
        {hasVariants && (
          <div className="flex gap-1.5 mb-2">
            {hasHalf && (
              <button
                onClick={() => setSelectedSize('half')}
                className="flex-1 py-1 rounded-lg text-[10px] font-bold transition-all duration-150 active:scale-95"
                style={{
                  fontFamily: 'Poppins,sans-serif',
                  background: selectedSize === 'half' ? 'var(--primary-deep)' : 'rgba(148,9,1,0.08)',
                  color:      selectedSize === 'half' ? 'white' : 'var(--primary-deep)',
                  border:     `1px solid ${selectedSize === 'half' ? 'var(--primary-deep)' : 'rgba(148,9,1,0.25)'}`,
                }}
              >
                Half · ₹{item.halfPrice}
              </button>
            )}
            {hasFull && (
              <button
                onClick={() => setSelectedSize('full')}
                className="flex-1 py-1 rounded-lg text-[10px] font-bold transition-all duration-150 active:scale-95"
                style={{
                  fontFamily: 'Poppins,sans-serif',
                  background: selectedSize === 'full' ? '#A9BE55' : 'rgba(50,88,98,0.08)',
                  color:      selectedSize === 'full' ? 'white' : 'var(--admin)',
                  border:     `1px solid ${selectedSize === 'full' ? '#ffffff' : 'rgba(50,88,98,0.25)'}`,
                }}
              >
                Full · ₹{item.fullPrice}
              </button>
            )}
          </div>
        )}

        {/* Price + Add/Stepper */}
        <div className="flex items-center justify-between mt-auto pt-1.5" style={{ borderTop: '1px solid rgba(214,153,60,0.15)' }}>
          <span className="font-black text-sm" style={{ color: 'var(--text-price)', fontFamily: 'Poppins,sans-serif' }}>
            ₹{price}
          </span>

          {qty === 0 ? (
            <button
              onClick={handleAdd}
              className="text-[11px] font-bold px-4 py-1.5 rounded-full transition-all duration-200 active:scale-95 text-white"
              style={{ background: 'var(--primary-deep)', fontFamily: 'Poppins,sans-serif' }}
            >
              ADD
            </button>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full px-1 py-0.5" style={{ background: 'var(--primary-deep)' }}>
              <button onClick={() => decreaseQty(cartKey)} className="w-6 h-6 rounded-full bg-white font-black flex items-center justify-center text-base active:scale-90 transition-transform" style={{ color: 'var(--admin)' }}>−</button>
              <span className="text-white font-bold text-sm min-w-[16px] text-center" style={{ fontFamily: 'Poppins,sans-serif' }}>{qty}</span>
              <button onClick={() => increaseQty(cartKey)} className="w-6 h-6 rounded-full bg-white font-black flex items-center justify-center text-base active:scale-90 transition-transform" style={{ color: 'var(--admin)' }}>+</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuCard;
