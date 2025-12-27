// src/App.jsx
import React from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
} from "react-router-dom";
import { CartProvider } from "./context/CartContext";
import { AuthProvider, useAuth } from "./context/AuthContext";

import CardapioPage from "./pages/CardapioPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import LoginPage from "./pages/LoginPage";
import OrdersPage from "./pages/OrdersPage";

const tabs = [
  { to: "/", label: "Cardápio", match: ["/", "/cardapio"] },
  { to: "/pedidos", label: "Meus pedidos", match: ["/pedidos", "/rastreamento"] },
  { to: "/checkout", label: "Carrinho", match: ["/checkout"] },
];

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const AppLayout = ({ children }) => {
  const location = useLocation();
  const { customer, logout } = useAuth();

  if (location.pathname === "/login") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md">{children}</div>
      </div>
    );
  }

  const activePath = location.pathname;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-30 bg-gradient-to-r from-[#c81e1e] via-[#ef6c00] to-[#1f8a5b] text-white shadow-xl">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold tracking-tight">
                Anne &amp; Tom · Pedidos
              </p>
              <p className="text-xs text-white/80">
                Olá, {" "}
                {customer?.nome ||
                  customer?.name ||
                  customer?.firstName ||
                  "cliente"}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="text-xs font-semibold uppercase tracking-wide text-white/80 hover:text-white"
            >
              Sair
            </button>
          </div>

          <nav className="flex gap-2 rounded-full bg-black/20 px-2 py-2 text-xs shadow-2xl backdrop-blur">
            {tabs.map((tab) => {
              const isActive = tab.match.some((m) =>
                activePath === "/" ? m === "/" : activePath.startsWith(m)
              );
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`flex-1 rounded-full px-3 py-1.5 text-center text-[12px] font-semibold transition ${
                    isActive
                      ? "bg-white text-emerald-900 shadow-2xl ring-2 ring-white/90"
                      : "bg-white/30 text-white hover:bg-white/50"
                  } border border-white/70 shadow-xl`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-4 pt-3">
        {children}
      </main>
    </div>
  );
};

const AppRoutes = () => {
  return (
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
};

const App = () => (
  <AuthProvider>
    <CartProvider>
      <AppRoutes />
    </CartProvider>
  </AuthProvider>
);

export default App;

