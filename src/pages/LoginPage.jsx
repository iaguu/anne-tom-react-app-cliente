// src/pages/LoginPage.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DiscountWheel from "../components/DiscountWheel";

const maskPhone = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const LoginPage = () => {
  const { customer, loadingAuth, loginOrRegister } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [justRegistered, setJustRegistered] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    if (customer) {
      navigate(from, { replace: true });
    }
  }, [customer, from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const rawPhone = phone.replace(/\D/g, "");
    if (!rawPhone) {
      setError("Informe um telefone válido.");
      return;
    }

    const result = await loginOrRegister({ name, phone: rawPhone });

    if (!result.ok) {
      setError(result.error || "Não foi possível entrar. Tente novamente.");
      return;
    }

    if (result.isNew) {
      setJustRegistered(true);
    } else {
      navigate(from, { replace: true });
    }
  };

  const handleWheelFinished = (result) => {
    setLastResult(result);
    navigate(from, { replace: true });
  };

  const phoneDigits = phone.replace(/\D/g, "");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="mb-4 text-center">
        <h1 className="text-lg font-semibold tracking-tight">
          Bem-vindo ao app de pedidos
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Entre com seu WhatsApp para acessar o cardápio, acompanhar pedidos e
          acumular fidelidade.
        </p>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Nome
          </label>
          <input
            type="text"
            autoComplete="name"
            placeholder="Seu nome"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Usado apenas para identificar seus pedidos.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            WhatsApp
          </label>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 9 9999-9999"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Vamos buscar seu cadastro pelo WhatsApp. Se for seu primeiro
            pedido, criamos automaticamente.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loadingAuth}
          className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loadingAuth ? "Entrando..." : "Entrar e ver cardápio"}
        </button>
      </form>

      {justRegistered && (
        <div className="mt-6 border-t border-slate-100 pt-4">
          <DiscountWheel
            phone={phoneDigits}
            onFinished={handleWheelFinished}
          />
        </div>
      )}

      {lastResult && (
        <p className="mt-2 text-center text-[11px] text-slate-500">
          Cupom desbloqueado:{" "}
          <span className="font-semibold text-emerald-700">
            {lastResult.code}
          </span>{" "}
          ({lastResult.label})
        </p>
      )}
    </div>
  );
};

export default LoginPage;
