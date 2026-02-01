// src/App.jsx
import React from "react";
import { Routes, Route, Navigate, useLocation, Link } from "react-router-dom";
import { CartProvider, useCart } from "./context/CartContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

import CardapioPage from "./pages/CardapioPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import LoginPage from "./pages/LoginPage";
import OrdersPage from "./pages/OrdersPage";

// Ícones em SVG para tabs e header
const IconPizza = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M3.5 6L12 3L20.5 6L12 21L3.5 6Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 7.2L18 7.2"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
    <circle cx="10" cy="10" r="1" fill="currentColor" />
    <circle cx="14" cy="12.5" r="1" fill="currentColor" />
  </svg>
);

const IconOrders = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="5"
      y="4"
      width="14"
      height="16"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M8 9H16"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M8 12.5H14"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M8 16H11"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const IconCartTab = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M4 5H5.5L7.5 16H18L20 8H8"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="9.5" cy="19" r="1.3" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="17" cy="19" r="1.3" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

// Abas principais
const tabs = [
  { to: "/", label: "Cardapio", icon: IconPizza, match: ["/", "/cardapio"] },
  { to: "/pedidos", label: "Pedidos", icon: IconOrders, match: ["/pedidos", "/rastreamento"] },
  { to: "/checkout", label: "Carrinho", icon: IconCartTab, match: ["/checkout"] },
];

// Rota protegida por autenticação
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

// Layout principal do app
const AppLayout = ({ children }) => {
  const location = useLocation();
  const activePath = location.pathname;

  // Hooks aqui para evitar variáveis soltas dentro do JSX (e garantir render consistente)
  const { totalItems = 0 } = useCart() || {};
  const { customer } = useAuth() || {};

  // Layout específico para tela de login
  if (activePath === "/login") {
    return (
      <div className="min-h-screen bg-[#FFF7EC] flex flex-col">
        <main className="flex-1 w-full max-w-5xl mx-auto pt-6 pb-8 px-2 md:px-6">
          <div className="w-full rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF7EC] flex flex-col">
      {/* TOP BAR */}
      <header className="inset-x-0 top-0 z-40 bg-[#FFF7EC]">
        <div className="mx-auto max-w-5xl px-4 pt-4 pb-3 md:px-6">
          {/* CARD SUPERIOR */}
          <div className="rounded-2xl bg-white border border-orange-100 shadow-md px-4 py-3">
            <div className="flex items-start justify-between gap-4">
              {/* LADO ESQUERDO */}
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-[#264D3D] flex items-center justify-center text-white shadow">
                  <svg className="h-4 w-4 text-amber-100" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3.5 6L12 3L20.5 6L12 21L3.5 6Z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                <div className="flex flex-col leading-tight">
                  <p className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-[#264D3D]">
                    Anne & Tom • Delivery
                  </p>
                  <p className="text-[10px] text-neutral-500 hidden md:block">
                    Olá, {customer?.nome || "cliente"} — acompanhe seu pedido.
                  </p>
                </div>
              </div>

              {/* LADO DIREITO (removido para simplificar a interface mobile) */}
            </div>
          </div>

          {/* NAV / TABS */}
          <nav className="mt-3 grid grid-cols-3 gap-3 rounded-2xl bg-white px-3 py-2 border border-neutral-200 shadow-sm">
            {tabs.map((tab) => {
              const isActive = tab.match.some((m) =>
                m === "/" ? activePath === "/" : activePath.startsWith(m)
              );
              const Icon = tab.icon;
              const showBadge = tab.to === "/checkout" && totalItems > 0;

              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all ${
                    isActive
                      ? "bg-[#FF914D] text-white shadow"
                      : "bg-transparent text-[#264D3D] hover:bg-[#FFF7F0]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-[#264D3D]"}`} />
                  {tab.label}
                  {showBadge && (
                    <span className="ml-1 h-4 min-w-[16px] flex items-center justify-center rounded-full bg-[#E63946] px-1 text-[9px] font-bold text-white">
                      {totalItems}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 w-full max-w-5xl mx-auto pt-6 pb-8 px-2 md:px-6">
        <div className="w-full rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
};

// Rotas principais da aplicação
const AppRoutes = () => (
  <AppLayout>
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <CardapioPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cardapio"
        element={
          <ProtectedRoute>
            <CardapioPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pedidos"
        element={
          <ProtectedRoute>
            <OrdersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/confirmacao"
        element={
          <ProtectedRoute>
            <OrderConfirmationPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/rastreamento"
        element={
          <ProtectedRoute>
            <OrderConfirmationPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AppLayout>
);

// Root component
const App = () => (
  <AuthProvider>
    <CartProvider>
      <AppRoutes />
    </CartProvider>
  </AuthProvider>
);

export default App;
