import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    const saved = sessionStorage.getItem('restaurant_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(() => {
    return sessionStorage.getItem('restaurant_cart_restId') || '1';
  });

  useEffect(() => {
    sessionStorage.setItem('restaurant_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    sessionStorage.setItem('restaurant_cart_restId', selectedRestaurantId);
  }, [selectedRestaurantId]);

  const addToCart = (item, restId = '1', customization = null) => {
    setSelectedRestaurantId(restId.toString());
    const cartKey = customization ? `${item.id}_${customization.spiceLevel || ''}_${customization.addon || ''}` : `${item.id}`;
    setCartItems(prev => {
      const existing = prev.find(i => (i.cartKey || i.id.toString()) === cartKey);
      if (existing) {
        return prev.map(i =>
          (i.cartKey || i.id.toString()) === cartKey ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, cartKey, customization, quantity: 1 }];
    });
  };

  const updateQuantity = (cartKeyOrId, delta) => {
    setCartItems(prev => {
      return prev
        .map(i => {
          const match = (i.cartKey || i.id.toString()) === cartKeyOrId.toString() || i.id === cartKeyOrId;
          if (match) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean);
    });
  };

  const removeFromCart = (cartKeyOrId) => {
    setCartItems(prev => prev.filter(i => (i.cartKey || i.id.toString()) !== cartKeyOrId.toString() && i.id !== cartKeyOrId));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        selectedRestaurantId,
        setSelectedRestaurantId,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartTotal,
        cartCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
