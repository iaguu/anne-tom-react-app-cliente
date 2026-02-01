// src/pages/CheckoutPage.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCheckout } from "../hooks/useCheckout";

import CarrinhoStep from "../components/checkout/CarrinhoStep";
import DadosStep from "../components/checkout/DadosStep";
import RevisaoStep from "../components/checkout/RevisaoStep";
import PagamentoStep from "../components/checkout/PagamentoStep";
import ResumoLateral from "../components/checkout/ResumoLateral";
import ResumoMobile from "../components/checkout/ResumoMobile";

// Ícones em SVG simples para steps e botões
const IconCart = ({ className }) => (
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
    <circle cx="9.5" cy="19" r="1.2" stroke="currentColor" strokeWidth="1.4" />
    <circle cx="17" cy="19" r="1.2" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

const IconData = ({ className }) => (
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
      d="M8 9H16M8 13H13"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const IconReview = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 6H19V16H9L6 19V16H5V6Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 10H15"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M9 13H12.5"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
);

const IconPayment = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="3"
      y="6"
      width="18"
      height="12"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M3 10H21"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <rect
      x="7"
      y="13"
      width="4"
      height="2"
      rx="0.6"
      fill="currentColor"
    />
  </svg>
);

const IconArrowLeft = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15 6L9 12L15 18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconArrowRight = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9 6L15 12L9 18"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconCheck = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M8.5 12.5L11 15L15.5 9.5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const stepIcons = [IconCart, IconData, IconReview, IconPayment];

const CheckoutPage = () => {
  const navigate = useNavigate();
  const [checkoutError, setCheckoutError] = useState("");
  const PENDING_CARD_ORDER_KEY = "pending_card_order";

  const {
    // cart
    items,
    totalItens,
    // etapas
    passo,
    etapas,
    avancar,
    voltar,
    // dados
    dados,
    setDados,
    tipoCliente,
    setTipoCliente,
    // cliente API
    clienteExistente,
    checandoCliente,
    erroClienteApi,
    onBuscarClientePorTelefone,
    // CEP
    buscarCep,
    buscandoCep,
    erroCep,
    // cupom
    cupom,
    setCupom,
    aplicarCupom,
    // pagamento
    pagamento,
    setPagamento,
    pixPayment,
    pixLoading,
    pixError,
    createPixPayment,
    // cartão
    cardPayment,
    cardLoading,
    cardError,
    createCardPayment,
    cardCheckoutUrl,
    // totais
    subtotal,
    taxaEntrega,
    desconto,
    totalFinal,
    podeEnviar,
    enviando,
    deliveryEta,
    deliveryEtaLoading,
    deliveryEtaError,
    distanceKm,
    distanceFee,
    deliveryFeeLabel,
    podeAvancarDados,
    // cart actions
    updateQuantity,
    removeItem,
    addItem,
    // envio
    enviarPedido,
  } = useCheckout();

  const handleEnviarPedido = async () => {
    if (!podeEnviar || enviando) return;
    setCheckoutError("");

    try {
      if (pagamento === "cartao") {
        const resolveCardUrl = (payment) =>
          payment?.checkoutUrl ||
          payment?.metadata?.providerRaw?.url ||
          payment?.metadata?.url ||
          payment?.url ||
          "";

        let checkoutUrl = cardCheckoutUrl || resolveCardUrl(cardPayment);
        let cardSnapshot = cardPayment;

        if (!checkoutUrl) {
          const createdPayment = await createCardPayment();
          cardSnapshot = createdPayment || cardSnapshot;
          checkoutUrl = resolveCardUrl(createdPayment);
        }

        if (!checkoutUrl) {
          console.warn(
            "[CheckoutPage] Link de pagamento do cartao indisponivel."
          );
          setCheckoutError(
            "Nao foi possivel gerar o link de pagamento. Tente novamente."
          );
          return;
        }

        const pendingPayload = {
          createdAt: Date.now(),
          items,
          dados,
          subtotal,
          taxaEntrega,
          desconto,
          totalFinal,
          pagamento,
          cardPayment: cardSnapshot,
        };

        try {
          localStorage.setItem(
            PENDING_CARD_ORDER_KEY,
            JSON.stringify(pendingPayload)
          );
        } catch (e) {
          console.warn("[CheckoutPage] Falha ao salvar pendingCardOrder:", e);
        }

        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
        return;
      }

      const result = await enviarPedido();

      console.log("[CheckoutPage] resultado enviarPedido:", result);

      if (!result || result.success === false) {
        console.warn(
          "[CheckoutPage] enviarPedido não retornou resultado válido:",
          result
        );
        setCheckoutError(
          "Não foi possível criar o pedido agora. Tente novamente em instantes."
        );
        return;
      }

      const {
        order,
        orderSummary,
        orderId,
        idPedido,
        codigoPedido,
        numeroPedido,
        backendOrderId: backendOrderIdFromResult,
        trackingId: trackingIdFromResult,
        items: resultItems,
        orders,
      } = result;

      const firstOrderFromArray =
        Array.isArray(orders) && orders.length > 0 ? orders[0] : null;
      const firstItemFromArray =
        Array.isArray(resultItems) && resultItems.length > 0
          ? resultItems[0]
          : null;

      const backendOrderId =
        trackingIdFromResult ||
        backendOrderIdFromResult ||
        orderId ||
        idPedido ||
        codigoPedido ||
        numeroPedido ||
        order?.id ||
        order?.orderId ||
        firstOrderFromArray?.id ||
        firstOrderFromArray?.orderId ||
        firstItemFromArray?.id ||
        orderSummary?.backendOrderId ||
        orderSummary?.idPedidoApi ||
        null;

      console.log("[CheckoutPage] backendOrderId resolvido:", backendOrderId);

      const summaryToSend = {
        ...(orderSummary || {}),
        backendOrderId,
        trackingId: backendOrderId,
        orderIdApi: backendOrderId,
      };

      try {
        localStorage.setItem("lastOrderSummary", JSON.stringify(summaryToSend));
      } catch (e) {
        console.warn("[CheckoutPage] Falha ao salvar lastOrderSummary:", e);
      }

      navigate(
        backendOrderId
          ? `/confirmacao?orderId=${encodeURIComponent(backendOrderId)}`
          : "/confirmacao",
        {
          state: {
            orderSummary: summaryToSend,
            trackingId: backendOrderId,
            backendOrderId,
          },
        }
      );
    } catch (err) {
      console.error("[CheckoutPage] erro ao enviar pedido:", err);
      setCheckoutError(
        "Ocorreu um erro ao enviar o pedido. Verifique sua conexão e tente novamente."
      );
    }
  };

  const disableAdvance =
    (passo === 0 && totalItens === 0) ||
    (passo === 1 && !podeAvancarDados);

  const phoneDigits = String(dados.telefone || "").replace(/\D/g, "");
  const missingChecklist = [];
  if (passo === 1) {
    if (tipoCliente === "auto") {
      missingChecklist.push("Escolha se ja e cliente ou primeira vez.");
    }
    if (phoneDigits.length < 10) {
      missingChecklist.push("Informe o WhatsApp com DDD.");
    }
    if (!dados.nome.trim()) {
      missingChecklist.push("Informe o nome completo.");
    }
    if (!dados.retirada) {
      if (String(dados.cep || "").replace(/\D/g, "").length !== 8) {
        missingChecklist.push("Informe um CEP valido.");
      }
      if (!dados.endereco.trim()) {
        missingChecklist.push("Informe o endereco completo.");
      }
      if (!dados.bairro.trim()) {
        missingChecklist.push("Informe o bairro.");
      }
      if (deliveryEtaLoading) {
        missingChecklist.push("Calculando tempo de entrega...");
      }
      if (deliveryEtaError) {
        missingChecklist.push("Nao foi possivel calcular a entrega.");
      }
      if (distanceFee == null && !deliveryEtaLoading && !deliveryEtaError) {
        missingChecklist.push("Calcule a distancia da entrega.");
      }
    }
  }

  return (
    <div className="min-h-screen bg-white text-[#264d3d] flex flex-col">
      {/* HEADER SIMPLIFICADO MOBILE */}
      <header className="sticky top-0 z-30 bg-white/95 border-b border-slate-100 shadow-sm px-3 py-2 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="rounded-full p-2 bg-slate-100 hover:bg-orange-100 transition">
          <IconArrowLeft className="w-5 h-5 text-[#ff914d]" />
        </button>
        <h1 className="text-base font-bold tracking-tight flex-1 text-center">Checkout</h1>
      </header>

      {/* CONTEÚDO */}
      <main className="flex-1 w-full max-w-md mx-auto px-2 py-4 space-y-4">
        {/* ETAPAS / PROGRESSO */}
        <section className="rounded-xl border border-orange-100 bg-white px-3 py-3 shadow-sm mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[#ff914d] uppercase tracking-widest">
              Etapa {passo + 1} de {etapas.length}
            </span>
          </div>

          <div className="flex justify-between gap-1">
            {etapas.map((etapa, i) => {
              const isActive = i === passo;
              const isDone = i < passo;
              const Icon = stepIcons[i] || IconCart;

              return (
                <div
                  key={etapa}
                  className="flex-1 flex flex-col items-center group"
                >
                  <div className="relative flex items-center justify-center w-full">
                    {i > 0 && (
                      <div
                        className={`absolute left-0 right-0 h-[2px] rounded-full ${
                          isDone ? "bg-[#ff914d]" : "bg-[#ff914d]/25"
                        }`}
                      />
                    )}
                    <div
                      className={`relative z-10 w-9 h-9 flex items-center justify-center rounded-full border text-xs shadow-sm transition-all duration-200
                        ${
                          isActive
                            ? "bg-[#ff914d] border-[#ff914d] text-white scale-105"
                            : isDone
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-white border-[#ff914d]/30 text-[#264d3d]/40"
                        }
                      `}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <span
                    className={`mt-2 text-[11px] font-semibold text-center uppercase tracking-wide ${
                      isActive
                        ? "text-[#e63946]"
                        : isDone
                        ? "text-[#264d3d]"
                        : "text-[#264d3d]/40"
                    }`}
                  >
                    {etapa}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* PRINCIPAL + RESUMO */}
        <section className="w-full">
          {/* COLUNA PRINCIPAL */}
          <div className="bg-white border border-orange-100 rounded-xl shadow p-3 space-y-4">
            {passo === 0 && (
              <CarrinhoStep
                items={items}
                updateQuantity={updateQuantity}
                removeItem={removeItem}
              />
            )}

            {passo === 1 && (
              <DadosStep
                dados={dados}
                setDados={setDados}
                cupom={cupom}
                setCupom={setCupom}
                aplicarCupom={aplicarCupom}
                buscarCep={buscarCep}
                buscandoCep={buscandoCep}
                erroCep={erroCep}
                checandoCliente={checandoCliente}
                clienteExistente={clienteExistente}
                erroClienteApi={erroClienteApi}
                onBuscarClientePorTelefone={onBuscarClientePorTelefone}
                tipoCliente={tipoCliente}
                setTipoCliente={setTipoCliente}
                deliveryEta={deliveryEta}
                deliveryEtaLoading={deliveryEtaLoading}
                deliveryEtaError={deliveryEtaError}
                distanceFee={distanceFee}
                deliveryFeeLabel={deliveryFeeLabel}
              />
            )}

            {passo === 2 && (
              <RevisaoStep
                dados={dados}
                subtotal={subtotal}
                taxaEntrega={taxaEntrega}
                desconto={desconto}
                totalFinal={totalFinal}
              />
            )}

            {passo === 3 && (
              <PagamentoStep
                subtotal={subtotal}
                taxaEntrega={taxaEntrega}
                desconto={desconto}
                totalFinal={totalFinal}
                pagamento={pagamento}
                setPagamento={setPagamento}
                pixPayment={pixPayment}
                pixLoading={pixLoading}
                pixError={pixError}
                onCreatePix={createPixPayment}
                cardLoading={cardLoading}
                cardError={cardError}
                cardCheckoutUrl={cardCheckoutUrl}
              />
            )}

            {/* BOTÕES NAVEGAÇÃO */}
            <div className="pt-2 border-t border-orange-100 space-y-2">
              <div className="flex flex-col gap-2">
                <button
                  onClick={voltar}
                  disabled={passo === 0}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm border border-slate-200 bg-white text-[#264d3d] hover:bg-orange-50 transition ${
                    passo === 0 ? "opacity-40 cursor-not-allowed" : ""
                  }`}
                >
                  <IconArrowLeft className="w-4 h-4" />
                  <span>Voltar</span>
                </button>

                {passo < 2 && (
                  <button
                    onClick={avancar}
                    disabled={disableAdvance}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-[#ff914d] text-white shadow hover:bg-[#e86d26] transition ${
                      disableAdvance ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <span>Continuar</span>
                    <IconArrowRight className="w-4 h-4" />
                  </button>
                )}

                {passo === 1 && missingChecklist.length > 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Falta para continuar
                    </p>
                    <ul className="mt-1 space-y-1">
                      {missingChecklist.slice(0, 3).map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-amber-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    {missingChecklist.length > 3 && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        +{missingChecklist.length - 3} itens pendentes
                      </p>
                    )}
                  </div>
                )}

                {passo === 2 && (
                  <button
                    onClick={avancar}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold bg-[#ff914d] text-white shadow hover:bg-[#e86d26] transition"
                  >
                    <span>Ir para pagamento</span>
                    <IconPayment className="w-5 h-5" />
                  </button>
                )}

                {passo === 3 && (
                  <button
                    onClick={handleEnviarPedido}
                    disabled={!podeEnviar}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                      podeEnviar
                        ? "bg-[#264d3d] text-white hover:bg-[#ff914d] hover:text-[#264d3d] shadow"
                        : "bg-[#264d3d]/15 text-[#264d3d]/45 cursor-not-allowed"
                    }`}
                  >
                    {enviando ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#e63946] border-t-transparent" />
                        <span>Enviando pedido...</span>
                      </>
                    ) : (
                      <>
                        <span>Finalizar pedido</span>
                        <IconCheck className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </div>

              {checkoutError && (
                <div className="flex items-start gap-2 rounded-lg border border-[#e63946]/30 bg-[#e63946]/8 px-2 py-2 text-xs text-[#a22932]">
                  <div className="mt-0.5 h-4 w-4 rounded-full border border-[#e63946] flex items-center justify-center text-[10px]">
                    !
                  </div>
                  <div className="flex-1 space-y-1">
                    <p>{checkoutError}</p>
                    <button
                      type="button"
                      onClick={handleEnviarPedido}
                      disabled={!podeEnviar || enviando}
                      className={`inline-flex items-center gap-1 rounded-full border border-[#e63946] bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#e63946] ${
                        !podeEnviar || enviando
                          ? "cursor-not-allowed opacity-60"
                          : "hover:bg-[#ffe6e8]"
                      }`}
                    >
                      <span>Tentar novamente</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RESUMO LATERAL - REMOVIDO NO MOBILE */}
        </section>
      </main>

      {/* RESUMO MOBILE FIXO */}
      <ResumoMobile items={items} totalFinal={totalFinal} />
    </div>
  );
};

export default CheckoutPage;
