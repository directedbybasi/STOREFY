"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  getStorefrontCartAction,
  addToStorefrontCartAction,
  updateStorefrontCartItemQuantityAction,
  removeStorefrontCartItemAction,
  clearStorefrontCartAction,
} from "@/modules/cart/actions";
import type { CartDTO } from "@/modules/cart/service";

interface CartContextType {
  cart: CartDTO | null;
  isOpen: boolean;
  isLoading: boolean;
  openCart: () => void;
  closeCart: () => void;
  refreshCart: () => Promise<void>;
  addToCart: (variantId: string, quantity?: number) => Promise<boolean>;
  updateQuantity: (variantId: string, quantity: number) => Promise<boolean>;
  removeItem: (variantId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  error: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
  domain: string;
  initialCart?: CartDTO | null;
}

export function CartProvider({ children, domain, initialCart = null }: CartProviderProps) {
  const [cart, setCart] = useState<CartDTO | null>(initialCart);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshCart = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getStorefrontCartAction(domain);
      if (res.success) {
        setCart(res.cart);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [domain]);

  useEffect(() => {
    if (!initialCart) {
      refreshCart();
    }
  }, [refreshCart, initialCart]);

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const addToCart = async (variantId: string, quantity = 1): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await addToStorefrontCartAction({ variantId, quantity }, domain);
      if (res.success) {
        setCart(res.cart);
        setIsOpen(true);
        return true;
      }
      return false;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add item to cart.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (variantId: string, quantity: number): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await updateStorefrontCartItemQuantityAction({ variantId, quantity }, domain);
      if (res.success) {
        setCart(res.cart);
        return true;
      }
      return false;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update item quantity.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const removeItem = async (variantId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await removeStorefrontCartItemAction({ variantId }, domain);
      if (res.success) {
        setCart(res.cart);
        return true;
      }
      return false;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove item.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearCart = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await clearStorefrontCartAction(domain);
      if (res.success) {
        setCart(res.cart);
        return true;
      }
      return false;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to clear cart.");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        isOpen,
        isLoading,
        openCart,
        closeCart,
        refreshCart,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart: handleClearCart,
        error,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
