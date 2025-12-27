import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import server from "../api/server";

const STORAGE_KEY = "at_customer";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [customer, setCustomer] = useState(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      if (customer) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }, [customer]);

  const loginOrRegister = async ({ name, phone }) => {
    const cleanedPhone = String(phone || "")
      .replace(/\D/g, "")
      .replace(/^0+/, "");
    if (!cleanedPhone) {
      return { ok: false, error: "Informe um telefone válido." };
    }

    setLoading(true);
    try {
      // 1) tenta localizar cliente existente
      const existing = await server.checkCustomerByPhone(cleanedPhone);

      if (existing?.ok && existing.data) {
        const existingCustomer = existing.data;
        setCustomer(existingCustomer);
        return { ok: true, customer: existingCustomer, isNew: false };
      }

      // 2) se não encontrou, cria um novo
      const payload = {
        name: name || "Cliente",
        phone: cleanedPhone,
      };
      const created = await server.salvarCliente(payload);
      if (!created?.ok || !created.data) {
        return { ok: false, error: "Não foi possível criar seu cadastro." };
      }
      const newCustomer = created.data;
      setCustomer(newCustomer);
      return { ok: true, customer: newCustomer, isNew: true };
    } catch (error) {
      console.error("[Auth] Falha no login/cadastro:", error);
      return {
        ok: false,
        error: "Não foi possível conectar. Tente novamente em instantes.",
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setCustomer(null);
  };

  const value = useMemo(
    () => ({
      customer,
      loadingAuth: loading,
      loginOrRegister,
      logout,
      isAuthenticated: !!customer,
    }),
    [customer, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
};
