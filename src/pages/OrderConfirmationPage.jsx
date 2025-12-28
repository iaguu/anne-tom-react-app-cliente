// src/pages/OrderConfirmationPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import server from "../api/server";
import { formatCurrencyBRL } from "../utils/menu";

// -----------------------------
// Helpers de status / ETA
// -----------------------------
const normalizeStatus = (status) => {
  if (!status) return "open";
  const s = status.toString().toLowerCase().trim();
  if (s === "finalizado" || s === "done") return "done";
  if (s === "cancelado" || s === "cancelled") return "cancelled";
  if (["em_preparo", "preparo", "preparing"].includes(s)) return "preparing";
  if (
    s === "out_for_delivery" ||
    s === "delivery" ||
    s === "em_entrega" ||
    s === "in_delivery"
  ) {
    return "out_for_delivery";
  }
  if (s === "open" || s === "em_aberto") return "open";
  return s;
};

const STATUS_STEPS = [
  { key: "open", label: "Pedido recebido" },
  { key: "preparing", label: "Em preparo" },
  { key: "out_for_delivery", label: "Saiu para entrega" },
  { key: "done", label: "Entregue" },
];

const getStepIndex = (statusKey) => {
  const normalized = normalizeStatus(statusKey);
  if (normalized === "done") return 3;
  if (normalized === "out_for_delivery") return 2;
  if (normalized === "preparing") return 1;
  if (normalized === "cancelled") return 2;
  return 0;
};

const statusLabelForCustomer = (statusKey) => {
  const s = normalizeStatus(statusKey);
  if (s === "open") return "Pedido recebido";
  if (s === "preparing") return "Em preparação";
  if (s === "out_for_delivery") return "Saiu para entrega";
  if (s === "done") return "Entregue";
  if (s === "cancelled") return "Pedido cancelado";
  return s;
};

const etaTextForStatus = (statusKey, bairro) => {
  const s = normalizeStatus(statusKey);
  if (s === "open" || s === "preparing") {
    return bairro
      ? `35 a 55 minutos na região de ${bairro}`
      : "35 a 55 minutos";
  }
  if (s === "out_for_delivery") {
    return "Seu pedido saiu para entrega e deve chegar em poucos minutos.";
  }
  if (s === "done") {
    return "Pedido finalizado. Qualquer coisa, chama a gente no WhatsApp. ❤️";
  }
  if (s === "cancelled") {
    return "Pedido cancelado. Se for um engano, fale com a gente pelo WhatsApp.";
  }
  return null;
};

const OrderConfirmationPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [resumo, setResumo] = useState(null);

  // 🔑 ID usado para bater no endpoint /motoboy/pedido/:id
  const [trackingId, setTrackingId] = useState(null);

  // dados em tempo real retornados pela API
  const [trackingData, setTrackingData] = useState(null);
  const [trackingStatus, setTrackingStatus] = useState("open");
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState(null);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    if (!shareMessage) return;
    const timer = setTimeout(() => setShareMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [shareMessage]);

  // -------------------------------------------------------------------
  // 1) Resolver resumo + trackingId (URL + state + localStorage)
  // -------------------------------------------------------------------
  useEffect(() => {
    let summary = null;

    // a) state vindo do navigate()
    if (location.state && location.state.orderSummary) {
      summary = location.state.orderSummary;
    } else {
      // b) fallback – último resumo salvo
      try {
        const salvo = localStorage.getItem("lastOrderSummary");
        if (salvo) summary = JSON.parse(salvo);
      } catch {
        // ignora
      }
    }

    if (summary) {
      setResumo(summary);
      // regrava pra manter sincronizado
      try {
        localStorage.setItem("lastOrderSummary", JSON.stringify(summary));
      } catch {
        // ignora
      }
    }

    // c) ID bruto vindo pela URL (?orderId=orders-...)
    let fromUrl = null;
    try {
      const searchParams = new URLSearchParams(window.location.search || "");
      fromUrl =
        searchParams.get("orderId") || searchParams.get("tracking") || null;
    } catch {
      fromUrl = null;
    }

    // d) ID vindo pelo state
    const fromStateTracking =
      location.state?.trackingId ||
      location.state?.backendOrderId ||
      location.state?.orderIdApi ||
      null;

    // e) ID vindo de dentro do resumo
    const fromSummary =
      summary?.backendOrderId ||
      summary?.trackingId ||
      summary?.orderIdApi ||
      summary?.order?.id ||
      null;

    const resolved = fromUrl || fromStateTracking || fromSummary || null;

    setTrackingId(resolved);
    setDeliveryConfirmed(
      resolved
        ? window.localStorage?.getItem(`order-delivery-confirmed-${resolved}`) ===
            "true"
        : false
    );

    console.log("[OrderConfirmation] trackingId resolvido:", {
      fromUrl,
      fromStateTracking,
      fromSummary,
      resolved,
    });
  }, [location.state]);

  // -------------------------------------------------------------------
  // Derivados para mostrar na tela
  // -------------------------------------------------------------------
  const semResumo = !resumo || !resumo.items || !resumo.items.length;

  const totalItens = semResumo
    ? 0
    : resumo.items.reduce(
        (acc, item) => acc + Number(item.quantidade || 0),
        0
      );

  // Número amigável exibido (#92336)
  const codigoPedido =
    resumo?.numeroPedidoDisplay ||
    resumo?.orderCode ||
    resumo?.codigoPedido ||
    resumo?.idPedido ||
    resumo?.numeroPedido ||
    (trackingData?.id
      ? String(trackingData.id).split("-")[
          String(trackingData.id).split("-").length - 1
        ]
      : null) ||
    (trackingId
      ? String(trackingId).split("-")[
          String(trackingId).split("-").length - 1
        ]
      : null);

  const bairroResumo =
    resumo?.dados?.bairro ||
    trackingData?.customerSnapshot?.address?.neighborhood ||
    null;

  const effectiveStatus = trackingId ? trackingStatus : "preparing";
  const stepIndex = getStepIndex(effectiveStatus);
  const statusLabel = statusLabelForCustomer(effectiveStatus);
  const etaText = etaTextForStatus(effectiveStatus, bairroResumo);

  const motoboySnapshot =
    trackingData?.motoboySnapshot ||
    trackingData?.delivery?.motoboySnapshot ||
    null;

  const motoboy = motoboySnapshot
    ? {
        name: motoboySnapshot.name,
        phone: motoboySnapshot.phone,
      }
    : trackingData?.motoboyName
    ? {
        name: trackingData.motoboyName,
        phone: trackingData.motoboyPhone || null,
      }
    : null;

  const trackingShareUrl = trackingId
    ? `${window.location.origin}/rastreamento?orderId=${encodeURIComponent(
        trackingId
      )}`
    : "";

  const handleShareTracking = async () => {
    if (!trackingShareUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Acompanhar pedido",
          url: trackingShareUrl,
        });
        setShareMessage("Link pronto para compartilhar.");
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(trackingShareUrl);
        setShareMessage("Link copiado para compartilhar.");
        return;
      }
      setShareMessage(trackingShareUrl);
    } catch (err) {
      console.error("[OrderConfirmation] share error:", err);
      setShareMessage("Nao foi possivel compartilhar o link.");
    }
  };

  // -------------------------------------------------------------------
  // 2) Polling em tempo real – agora lendo data.items[0] ou data.order
  // -------------------------------------------------------------------
  useEffect(() => {
    if (!trackingId) {
      return;
    }

    let cancelled = false;
    let intervalId = null;

    const fetchStatus = async () => {
      try {
        setTrackingLoading(true);
        setTrackingError(null);

        const resp = await server.fetchStatus(encodeURIComponent(trackingId))

        if (!resp.ok) {
          throw new Error(`HTTP ${resp.status}`);
        }

        const contentType = resp.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const txt = await resp.text();
          console.error(
            "[OrderConfirmation] Resposta não JSON no tracking (provável HTML do Ngrok):",
            txt.slice(0, 400)
          );
          throw new Error("Resposta não JSON da API de tracking.");
        }

        const data = await resp.json();
        if (cancelled) return;

        console.log("[OrderConfirmation] resposta do tracking:", data);

        // Ajuste pro formato real:
        // - se vier { items: [ {...} ] }, pega o primeiro
        // - se vier { order: {...} }, usa order
        let order = null;
        if (Array.isArray(data.items) && data.items.length > 0) {
          order = data.items[0];
        } else if (data.order) {
          order = data.order;
        } else {
          order = null;
        }

        // se ainda assim não tiver nada, não quebra a tela
        if (!order) {
          console.warn(
            "[OrderConfirmation] Nenhum pedido encontrado no retorno do tracking."
          );
          return;
        }

        const rawStatus =
          // status principal do pedido
          order.status ||
          order.orderStatus ||
          // status do motoboy (delivering/out_for_delivery)
          order.motoboyStatus ||
          data.status ||
          data.orderStatus ||
          "open";

        setTrackingData(order);
        if (!deliveryConfirmed) {
          setTrackingStatus(normalizeStatus(rawStatus || "open"));
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[OrderConfirmation] erro ao buscar status:", err);
        setTrackingError("Não foi possível atualizar o status em tempo real.");
      } finally {
        if (!cancelled) {
          setTrackingLoading(false);
        }
      }
    };

    fetchStatus();
    intervalId = window.setInterval(fetchStatus, 10000);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [trackingId, deliveryConfirmed]);

  // -------------------------------------------------------------------
  // UI (layout original, sem mudanças visuais drásticas)
  // -------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-slate-100 text-slate-900 flex flex-col">
      {/* HEADER */}
      <header className="border-b bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto h-16 px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logopizzaria.png"
              alt="Anne & Tom Pizzaria"
              className="w-10 h-10 object-contain"
            />
            <div className="leading-tight">
              <p className="text-sm font-semibold">Anne &amp; Tom Pizzaria</p>
              <p className="text-[11px] text-slate-500">
                Zona Norte • São Paulo
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => navigate("/cardapio")}
            className="text-[11px] border rounded-full px-4 py-1.5 bg-white hover:bg-slate-50"
          >
            Montar um novo pedido →
          </button>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 space-y-6">
            {/* ÍCONE / TÍTULO */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 via-emerald-200 to-emerald-300 text-emerald-700 flex items-center justify-center text-lg shadow-inner">
                ✓
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold">
                  Pedido enviado com sucesso!
                </h1>
                <p className="text-xs text-slate-500">
                  Recebemos o seu pedido e ele já foi encaminhado para o sistema
                  interno da Anne &amp; Tom. Agora é com a cozinha. 🍕
                </p>
                {codigoPedido && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    <span className="font-semibold text-slate-700">
                      Número do pedido:&nbsp;
                    </span>
                    #{codigoPedido}
                  </p>
                )}
                {trackingId ? (
                  <p className="text-[10px] text-emerald-700 mt-0.5">
                    Acompanhando seu pedido em tempo real.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Acompanhamento em tempo real indisponivel. Mostrando status estimado.
                  </p>
                )}
              </div>
            </div>

            {/* STATUS / PRAZO + STEPPER */}
            <div className="bg-slate-50 rounded-2xl px-4 py-3 text-xs flex flex-col gap-2 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">
                  {trackingId ? "Status do pedido" : "Status inicial"}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-[10px] font-semibold text-emerald-700">
                  {statusLabel}
                  {trackingLoading && (
                    <span className="ml-1 animate-pulse">•</span>
                  )}
                </span>
              </div>

              {etaText && (
                <p className="flex justify-between">
                  <span className="text-slate-500">Previsão de entrega</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {etaText}
                  </span>
                </p>
              )}

              {bairroResumo && (
                <p className="flex justify-between">
                  <span className="text-slate-500">Bairro</span>
                  <span className="font-semibold text-slate-800">
                    {bairroResumo}
                  </span>
                </p>
              )}

              {motoboy && (
                <p className="flex justify-between">
                  <span className="text-slate-500">Motoboy</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {motoboy.name}
                    {motoboy.phone && (
                      <span className="text-[10px] text-slate-500 ml-1">
                        ({motoboy.phone})
                      </span>
                    )}
                  </span>
                </p>
              )}

              {trackingError && (
                <p className="mt-1 text-[10px] text-amber-700">
                  {trackingError} Seu pedido continua válido; apenas o
                  acompanhamento automático pode ficar temporariamente
                  indisponível.
                </p>
              )}

              {/* Stepper visual */}
              <div className="mt-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  {STATUS_STEPS.map((step, index) => {
                    const active = index <= stepIndex;
                    const isCurrent = index === stepIndex;

                    return (
                      <div
                        key={step.key}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div className="flex items-center w-full">
                          <div className="flex-1 h-[2px]">
                            {index > 0 && (
                              <div
                                className={`h-[2px] ${
                                  index <= stepIndex
                                    ? "bg-emerald-500"
                                    : "bg-slate-200"
                                }`}
                              />
                            )}
                          </div>
                          <div
                            className={[
                              "w-6 h-6 rounded-full border flex items-center justify-center text-[10px]",
                              active
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "bg-white border-slate-300 text-slate-400",
                              isCurrent ? "ring-2 ring-emerald-300" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {index + 1}
                          </div>
                          <div className="flex-1 h-[2px]" />
                        </div>
                        <div className="mt-1 text-[9px] text-center leading-tight">
                          <p
                            className={
                              active
                                ? "font-semibold text-slate-800"
                                : "text-slate-400"
                            }
                          >
                            {step.label}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {trackingId &&
                trackingStatus !== "done" &&
                trackingStatus !== "cancelled" &&
                !deliveryConfirmed && (
                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!trackingId) return;
                        setConfirmError("");
                        setConfirmingDelivery(true);
                        const result = await server.confirmDelivery(trackingId);
                        setConfirmingDelivery(false);
                        if (!result?.ok) {
                          setConfirmError(
                            "Não foi possível confirmar a entrega agora."
                          );
                          return;
                        }
                        window.localStorage?.setItem(
                          `order-delivery-confirmed-${trackingId}`,
                          "true"
                        );
                        setDeliveryConfirmed(true);
                        setTrackingStatus("done");
                      }}
                      disabled={confirmingDelivery}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-400 disabled:opacity-60"
                    >
                      {confirmingDelivery ? "Confirmando..." : "Confirmar entrega"}
                    </button>
                    {confirmError && (
                      <p className="text-xs text-amber-700">{confirmError}</p>
                    )}
                  </div>
                )}
              {deliveryConfirmed && (
                <p className="mt-2 text-[11px] text-emerald-600">
                  Entrega confirmada. Obrigado por usar a Anne &amp; Tom!
                </p>
              )}
            </div>

            {/* RESUMO DO PEDIDO */}
            {!semResumo ? (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-slate-800">
                    Resumo do pedido
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {totalItens} item(s)
                  </p>
                </div>

                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 text-xs">
                  {resumo.items.map((item, idx) => (
                    <div
                      key={`${item.id}-${idx}`}
                      className="px-4 py-3 flex justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold">
                          {item.quantidade}x {item.nome}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {item.tamanho}
                          {Array.isArray(item.sabores) &&
                            item.sabores.length > 1 &&
                            ` · sabores: ${item.sabores.join(" / ")}`}
                          {!item.sabores &&
                            item.meio &&
                            ` · meio a meio com ${item.meio}`}
                          {item.obsPizza && ` · ${item.obsPizza}`}
                        </p>
                      </div>
                      <p className="text-slate-700 font-medium whitespace-nowrap">
                        {formatCurrencyBRL(
                          (item.precoUnitario || 0) * (item.quantidade || 0)
                        )}
                      </p>
                    </div>
                  ))}
                </div>

                {/* TOTAIS */}
                <div className="pt-1 space-y-1 text-xs">
                  <p className="flex justify-between">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-medium">
                      {formatCurrencyBRL(resumo.subtotal || 0)}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Entrega</span>
                    <span className="font-medium">
                      {formatCurrencyBRL(resumo.taxaEntrega || 0)}
                    </span>
                  </p>
                  {Number(resumo.desconto || 0) > 0 && (
                    <p className="flex justify-between text-emerald-600">
                      <span>Desconto</span>
                      <span>
                        - {formatCurrencyBRL(resumo.desconto || 0)}
                      </span>
                    </p>
                  )}
                  <p className="flex justify-between pt-1 text-sm font-semibold">
                    <span>Total</span>
                    <span>
                      {formatCurrencyBRL(resumo.totalFinal || 0)}
                    </span>
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-[11px] text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">
                  Não encontramos o resumo do pedido.
                </p>
                <p>
                  Isso pode acontecer se você recarregou a página ou acessou
                  este link diretamente. Seu pedido provavelmente foi enviado,
                  mas o resumo não pôde ser reconstituído aqui.
                </p>
                <p>
                  Se tiver dúvida, fale com a Anne pelo WhatsApp ou volte ao
                  cardápio para montar um novo pedido.
                </p>
              </div>
            )}

            {/* DADOS DO CLIENTE */}
            {resumo && resumo.dados && (
              <div className="border-t border-slate-100 pt-4 text-[11px] space-y-1">
                <p className="text-slate-500 font-semibold text-xs">
                  Dados do cliente
                </p>
                {resumo.dados.nome && (
                  <p>
                    <span className="text-slate-500">Nome: </span>
                    <span className="font-medium">{resumo.dados.nome}</span>
                  </p>
                )}
                {resumo.dados.telefone && (
                  <p>
                    <span className="text-slate-500">WhatsApp: </span>
                    <span className="font-medium">
                      {resumo.dados.telefone}
                    </span>
                  </p>
                )}
                {resumo.dados.endereco && (
                  <p>
                    <span className="text-slate-500">Endereço: </span>
                    <span className="font-medium">
                      {resumo.dados.endereco}
                    </span>
                  </p>
                )}
                {resumo.dados.obsGerais && (
                  <p>
                    <span className="text-slate-500">Observações: </span>
                    <span className="font-medium">
                      {resumo.dados.obsGerais}
                    </span>
                  </p>
                )}
              </div>
            )}

            {/* AÇÕES FINAIS */}
            <div className="pt-2 flex flex-col sm:flex-row justify-between gap-3 text-xs">
              <Link
                to="/cardapio"
                className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50"
              >
                Voltar ao cardápio
              </Link>

              {trackingShareUrl && (
                <button
                  type="button"
                  onClick={handleShareTracking}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-full border border-slate-300 bg-white hover:bg-slate-50"
                >
                  Compartilhar link
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  window.open("https://wa.me/5511932507007", "_blank")
                }
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:brightness-110"
              >
                Acompanhar pelo WhatsApp
              </button>
            </div>
            {shareMessage && (
              <p className="text-[11px] text-emerald-700">{shareMessage}</p>
            )}
          </div>

          <p className="mt-4 text-[11px] text-center text-slate-500">
            Se precisar ajustar algo no pedido, envie uma mensagem pelo WhatsApp
            o quanto antes. A equipe da Anne &amp; Tom te ajuda rapidinho.
          </p>
        </div>
      </main>
    </div>
  );
};

export default OrderConfirmationPage;
