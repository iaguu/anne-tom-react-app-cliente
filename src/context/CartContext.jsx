import React, { createContext, useContext, useMemo, useState } from "react";

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState([]);

  const addItem = (item) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.id === item.id && i.tamanho === item.tamanho
      );
      if (existingIndex !== -1) {
        const copy = [...prev];
        copy[existingIndex] = {
          ...copy[existingIndex],
          quantidade: copy[existingIndex].quantidade + item.quantidade,
        };
        return copy;
      }
      return [...prev, item];
    });
  };

  const updateQuantity = (id, tamanho, quantidade) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.id === id && i.tamanho === tamanho ? { ...i, quantidade } : i
        )
        .filter((i) => i.quantidade > 0)
    );
  };

  const removeItem = (id, tamanho) => {
    setItems((prev) =>
      prev.filter((i) => !(i.id === id && i.tamanho === tamanho))
    );
  };

  const replaceItem = (oldId, oldTamanho, newItem) => {
    setItems((prev) => {
      const index = prev.findIndex(
        (i) => i.id === oldId && i.tamanho === oldTamanho
      );
      if (index === -1) return [...prev, newItem];
      const copy = [...prev];
      copy[index] = newItem;
      return copy;
    });
  };

  const clearCart = () => setItems([]);

  const total = useMemo(
    () => items.reduce((acc, i) => acc + i.precoUnitario * i.quantidade, 0),
    [items]
  );

  const value = {
    items,
    addItem,
    updateQuantity,
    removeItem,
    replaceItem,
    clearCart,
    total,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart deve ser usado dentro de CartProvider");
  }
  return ctx;
};
