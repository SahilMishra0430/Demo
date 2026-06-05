import React, { createContext, useContext, useReducer, useCallback } from 'react';

const CartContext = createContext(null);

// ── Reducer ───────────────────────────────────────────────────────────────────
// All item lookups now use `cartKey` (= `${_id}_${selectedSize}` for variant
// items, or just `_id` for legacy items with no half/full pricing).
// This allows the same menu item to appear in the cart as both a half and full
// portion simultaneously without conflicting.

const cartReducer = (state, action) => {
  switch (action.type) {

    case 'ADD_ITEM': {
      const existing = state.items.find((i) => i.cartKey === action.item.cartKey);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.cartKey === action.item.cartKey ? { ...i, quantity: i.quantity + 1 } : i
          ),
        };
      }
      return { ...state, items: [...state.items, { ...action.item, quantity: 1 }] };
    }

    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.cartKey !== action.cartKey) };

    case 'INCREASE_QTY':
      return {
        ...state,
        items: state.items.map((i) =>
          i.cartKey === action.cartKey ? { ...i, quantity: i.quantity + 1 } : i
        ),
      };

    case 'DECREASE_QTY': {
      const item = state.items.find((i) => i.cartKey === action.cartKey);
      if (!item) return state;
      if (item.quantity <= 1) {
        return { ...state, items: state.items.filter((i) => i.cartKey !== action.cartKey) };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.cartKey === action.cartKey ? { ...i, quantity: i.quantity - 1 } : i
        ),
      };
    }

    case 'CLEAR_CART':
      return { ...state, items: [] };
    case 'OPEN_CART':
      return { ...state, isOpen: true };
    case 'CLOSE_CART':
      return { ...state, isOpen: false };
    case 'TOGGLE_CART':
      return { ...state, isOpen: !state.isOpen };
    default:
      return state;
  }
};

const initialState = { items: [], isOpen: false };

// ── Provider ──────────────────────────────────────────────────────────────────
export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  // addItem expects the item object to already have `cartKey` and `price` set
  // to the correct variant values (handled in MenuCard before calling addItem).
  const addItem     = useCallback((item)     => dispatch({ type: 'ADD_ITEM',     item }),     []);
  const removeItem  = useCallback((cartKey)  => dispatch({ type: 'REMOVE_ITEM',  cartKey }),  []);
  const increaseQty = useCallback((cartKey)  => dispatch({ type: 'INCREASE_QTY', cartKey }),  []);
  const decreaseQty = useCallback((cartKey)  => dispatch({ type: 'DECREASE_QTY', cartKey }),  []);
  const clearCart   = useCallback(()         => dispatch({ type: 'CLEAR_CART' }),              []);
  const openCart    = useCallback(()         => dispatch({ type: 'OPEN_CART' }),               []);
  const closeCart   = useCallback(()         => dispatch({ type: 'CLOSE_CART' }),              []);
  const toggleCart  = useCallback(()         => dispatch({ type: 'TOGGLE_CART' }),             []);

  const totalItems  = state.items.reduce((sum, i) => sum + i.quantity,           0);
  const totalAmount = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        isOpen: state.isOpen,
        totalItems,
        totalAmount,
        addItem,
        removeItem,
        increaseQty,
        decreaseQty,
        clearCart,
        openCart,
        closeCart,
        toggleCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
