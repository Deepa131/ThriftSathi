import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { cartAPI } from "../api/index";
import { useAuth } from "./AuthContext";
import toast from "react-hot-toast";

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems]         = useState([]);
  const [itemCount, setItemCount] = useState(0);
  const [subtotal, setSubtotal]   = useState(0);
  const [loading, setLoading]     = useState(false);

  const applyCart = (data) => {
    setItems(data.items || []);
    setItemCount(data.itemCount || 0);
    setSubtotal(data.subtotal || 0);
  };

  const refreshCart = useCallback(() => {
    if (!user) return;
    setLoading(true);
    cartAPI.get()
      .then(({ data }) => applyCart(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Load the cart once a user is logged in; clear it locally on logout.
  useEffect(() => {
    if (user) refreshCart();
    else { setItems([]); setItemCount(0); setSubtotal(0); }
  }, [user, refreshCart]);

  const addToCart = useCallback(async (listingId, quantity = 1) => {
    try {
      const { data } = await cartAPI.add(listingId, quantity);
      applyCart(data);
      toast.success("Added to cart!");
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't add to cart.");
      return false;
    }
  }, []);

  const updateQuantity = useCallback(async (listingId, quantity) => {
    try {
      const { data } = await cartAPI.update(listingId, quantity);
      applyCart(data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Couldn't update quantity.");
    }
  }, []);

  const removeFromCart = useCallback(async (listingId) => {
    try {
      const { data } = await cartAPI.remove(listingId);
      applyCart(data);
      toast.success("Removed from cart.");
    } catch {
      toast.error("Couldn't remove item.");
    }
  }, []);

  const clearCart = useCallback(async () => {
    try {
      await cartAPI.clear();
      setItems([]); setItemCount(0); setSubtotal(0);
    } catch {
      toast.error("Couldn't clear cart.");
    }
  }, []);

  return (
    <CartContext.Provider value={{
      items, itemCount, subtotal, loading,
      refreshCart, addToCart, updateQuantity, removeFromCart, clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}