// src/pages/OrdersPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { serverInstance } from "../api/server";
import { formatCurrencyBRL } from "../utils/menu";

const normalizeStatus = (status) => {
  if (!status) return "open";
  const s = status.toString().toLowerCase().trim();
  if (s === "finalizado" || s === "done" || s === "delivered") return "done";
  if (s === "cancelado" || s === "cancelled") return "cancelled";
  if (s.includes("delivery") || s === "out_for_delivery") return "out_for_delivery";
  if (s.includes("prep") || s === "preparing") return "preparing";
  return s;
};

const statusLabel = (status) => {
  const s = normalizeStatus(status);
  if (s === "open") return "Recebido";
  if (s === "preparing") return "Em preparação";
  if (s === "out_for_delivery") return "Saiu para entrega";
  if (s === "done") return "Entregue";
  if (s === "cancelled") return "Cancelado";
  return s;
};

const isActiveStatus = (status) => {
  const s = normalizeStatus(status);
  return s === "open" || s === "preparing" || s === "out_for_delivery";
};

const OrdersPage = () => {
  const { customer } = useAuth();
  const resolvedCustomerId =
    customer?.id ||
    customer?._id ||
    customer?.customerId ||
    customer?.customer_id ||
    null;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!resolvedCustomerId) return;

    let cancelled = false;

    const loadOrders = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await serverInstance.baseDomain.instance.get("/api/orders", {
          params: { customerId: resolvedCustomerId },
        });

        if (cancelled) return;

        const rawData = res.data || {};
        const data = Array.isArray(rawData)
          ? rawData
          : rawData.orders || rawData.items || [];
        setOrders(data || []);
      } catch (err) {
        console.error("[Orders] erro ao carregar pedidos:", err);
        if (!cancelled) {
          setError("Não foi possível carregar seus pedidos agora.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadOrders();
    const intervalId = window.setInterval(loadOrders, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [resolvedCustomerId]);

  const { activeOrders, pastOrders, points, totalSpent } = useMemo(() => {
    const safeOrders = Array.isArray(orders) ? orders : [];
    const active = safeOrders.filter((o) => isActiveStatus(o.status));
    const past = safeOrders.filter((o) => !isActiveStatus(o.status));

    const spent = safeOrders.reduce((sum, o) => {
      const v =
        o.total ??
        o.totals?.finalTotal ??
        o.totals?.total ??
        o.valorTotal ??
        0;
      return sum + Number(v || 0);
    }, 0);

    // regra simples: 1 ponto a cada R$ 40 em pedidos
    const pts = Math.floor(spent / 40);

    return {
      activeOrders: active,
      pastOrders: past,
      points: pts,
      totalSpent: spent,
    };
  }, [orders]);

  const nextRewardAt = 10;
  const progress = Math.min(100, (points / nextRewardAt) * 100);
  const missing = Math.max(0, nextRewardAt - points);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
        <p className="text-xs font-semibold text-amber-900">
          Programa de fidelidade
        </p>
        <p className="mt-1 text-[11px] text-amber-900">
          Você acumulou{" "}
          <span className="font-semibold">{points}</span> ponto
          {points === 1 ? "" : "s"} em pedidos online.
        </p>
        <p className="mt-1 text-[10px] text-amber-800">
          A cada <span className="font-semibold">10 pontos</span>, você pode
          trocar por benefícios como descontos, borda recheada ou sobremesas
          selecionadas.
        </p>

        <div className="mt-2 h-2 w-full rounded-full bg-amber-100">
          <div
            className="h-2 rounded-full bg-amber-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-amber-900">
          Faltam{" "}
          <span className="font-semibold">
            {missing <= 0 ? 0 : missing}
          </span>{" "}
          ponto{missing === 1 ? "" : "s"} para o próximo benefício.
        </p>
        <p className="mt-1 text-[10px] text-amber-700">
          Total já consumido neste cadastro:{" "}
          <span className="font-semibold">
            {formatCurrencyBRL(totalSpent)}
          </span>
          .
        </p>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Pedidos em andamento
          </h2>
          <p className="text-[11px] text-slate-500">
            Atualização automática a cada 15 segundos.
          </p>
        </div>

        {loading && (
          <p className="text-xs text-slate-500">Carregando pedidos...</p>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
            {error}
          </div>
        )}

        {!loading && activeOrders.length === 0 && !error && (
          <p className="text-xs text-slate-500">
            Nenhum pedido em andamento. Faça um novo pedido pelo cardápio.
          </p>
        )}

        <div className="space-y-2">
          {activeOrders.map((order) => {
            const status = normalizeStatus(order.status);
            const createdAt =
              order.createdAt || order.created_at || order.date || null;

            return (
              <div
                key={order.id || order._id}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-900">
                      Pedido{" "}
                      <span className="font-mono">
                        #{(order.shortId || order.id || "").toString().slice(-5)}
                      </span>
                    </p>
                    {createdAt && (
                      <p className="text-[10px] text-slate-500">
                        {new Date(createdAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                      status === "open" || status === "preparing"
                        ? "bg-amber-100 text-amber-800"
                        : status === "out_for_delivery"
                        ? "bg-emerald-100 text-emerald-800"
                        : status === "done"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-700",
                    ].join(" ")}
                  >
                    {statusLabel(status)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[11px] text-slate-700">
                    Total:{" "}
                    <span className="font-semibold">
                      {formatCurrencyBRL(
                        order.total ??
                          order.totals?.finalTotal ??
                          order.totals?.total ??
                          order.valorTotal ??
                          0
                      )}
                    </span>
                  </p>
                  <Link
                    to={`/rastreamento?orderId=${encodeURIComponent(
                      order.id || order._id
                    )}`}
                    className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    Ver rastreamento
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Histórico de pedidos
        </h2>

        {!loading && pastOrders.length === 0 && !error && (
          <p className="text-xs text-slate-500">
            Ainda não há pedidos finalizados neste cadastro.
          </p>
        )}

        <div className="space-y-2">
          {pastOrders.map((order) => {
            const status = normalizeStatus(order.status);
            const createdAt =
              order.createdAt || order.created_at || order.date || null;

            return (
              <div
                key={order.id || order._id}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-900">
                      Pedido{" "}
                      <span className="font-mono">
                        #{(order.shortId || order.id || "").toString().slice(-5)}
                      </span>
                    </p>
                    {createdAt && (
                      <p className="text-[10px] text-slate-500">
                        {new Date(createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <span
                    className={[
                      "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                      status === "done"
                        ? "bg-emerald-100 text-emerald-800"
                        : status === "cancelled"
                        ? "bg-red-100 text-red-700"
                        : "bg-slate-100 text-slate-700",
                    ].join(" ")}
                  >
                    {statusLabel(status)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-700">
                  Total:{" "}
                  <span className="font-semibold">
                    {formatCurrencyBRL(
                      order.total ??
                        order.totals?.finalTotal ??
                        order.totals?.total ??
                        order.valorTotal ??
                        0
                    )}
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default OrdersPage;
