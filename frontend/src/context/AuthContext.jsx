import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../api/index";
import toast from "react-hot-toast";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(() => {
    const stored = localStorage.getItem("ts_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  // Re-validate token on app start
  useEffect(() => {
    const token = localStorage.getItem("ts_token");
    if (!token) { setLoading(false); return; }

    authAPI.me()
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("ts_user", JSON.stringify(data.user));
      })
      .catch(() => {
        localStorage.removeItem("ts_token");
        localStorage.removeItem("ts_user");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authAPI.login(email, password);
    localStorage.setItem("ts_token", data.token);
    localStorage.setItem("ts_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (formData) => {
    const { data } = await authAPI.register(formData);
    localStorage.setItem("ts_token", data.token);
    localStorage.setItem("ts_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("ts_token");
    localStorage.removeItem("ts_user");
    setUser(null);
    toast.success("Logged out successfully.");
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem("ts_user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
