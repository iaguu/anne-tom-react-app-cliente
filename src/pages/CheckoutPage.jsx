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

const CheckoutPage = () => {
  const navigate = useNavigate();

  const [checkoutError, setCheckoutError] = useState("");

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

    // cart actions
    updateQuantity,
    removeItem,
    addItem,

    // envio
    enviarPedido,
  } = useCheckout();

  /**
   * Handler de envio:
   * espera que `enviarPedido()` retorne algo como:
   * {
   *   success: true,
   *   order,          // objeto vindo do apiServer (orders-...)
   *   orderSummary,   // resumo que a gente monta pro front
   * }
   */
  const handleEnviarPedido = async () => {
    if (!podeEnviar || enviando) return;
    setCheckoutError("");

    try {
      const result = await enviarPedido();

      console.log("[CheckoutPage] resultado enviarPedido:", result);

      // se o hook não retornar nada ou der erro silencioso, não faz nada
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
        items,
        orders,
      } = result;

      const firstOrderFromArray =
        Array.isArray(orders) && orders.length > 0 ? orders[0] : null;
      const firstItemFromArray =
        Array.isArray(items) && items.length > 0 ? items[0] : null;

      // tenta descobrir o id real do pedido criado no backend (o mesmo do PDV / motoboy)
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

      if (!backendOrderId) {
        console.warn(
          "[CheckoutPage] Pedido criado, mas NÃO foi possível encontrar um ID para tracking.",
          { result }
        );
      }

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
      // aqui você pode exibir algum toast/alert futuramente
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* HEADER */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto h-16 px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logopizzaria.png"
              alt="Anne & Tom Pizzaria"
              className="w-10 h-10 object-contain"
            />
            <div className="leading-tight">
              <p className="text-sm font-semibold">Checkout</p>
              <p className="text-[11px] text-slate-500">
                Revise e finalize seu pedido
              </p>
            </div>
          </Link>

          <Link
            to="/cardapio"
            className="text-xs border rounded-full px-4 py-1.5 hover:bg-slate-100"
          >
            ← Voltar ao cardápio
          </Link>
        </div>
      </header>

      {/* CONTEÚDO */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* ETAPAS */}
        <div className="grid grid-cols-4 gap-3 text-center text-xs">
          {etapas.map((etapa, i) => (
            <div
              key={etapa}
              className={`py-3 rounded-xl border ${
                i === passo
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white border-slate-200 text-slate-600"
              }`}
            >
              {i + 1}. {etapa}
            </div>
          ))}
        </div>

        {/* PRINCIPAL + RESUMO */}
        <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
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
              />
            )}

            {/* BOTÕES NAVEGAÇÃO */}
            <div className="flex justify-between pt-2 border-t border-slate-100">
              <button
                onClick={voltar}
                disabled={passo === 0}
                className={`px-5 py-2 rounded-full text-xs border border-slate-300 hover:bg-slate-100 ${
                  passo === 0 ? "opacity-40 cursor-not-allowed" : ""
                }`}
              >
                ← Voltar
              </button>

              {passo < 2 && (
                <button
                  onClick={avancar}
                  className="px-6 py-2 rounded-full text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800"
                >
                  Avançar →
                  {passo === 0 && totalItens > 0 && (
                    <span className="ml-1 text-[10px] opacity-80">
                      ({totalItens} item{totalItens > 1 ? "s" : ""})
                    </span>
                  )}
                </button>
              )}

              {passo === 2 && (
                <button
                  onClick={avancar}
                  className="px-6 py-2 rounded-full text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800"
                >
                  Confirmar e ir para pagamento →
                </button>
              )}

              {passo === 3 && (
                <button
                  onClick={handleEnviarPedido}
                  disabled={!podeEnviar}
                  className={`px-7 py-3 rounded-full text-xs font-semibold ${
                    podeEnviar
                      ? "bg-emerald-500 text-slate-900 hover:bg-emerald-400"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {enviando ? "Enviando..." : "Enviar Pedido"}
                </button>
              )}
              {checkoutError && (
                <p className="mt-2 text-xs text-amber-700">{checkoutError}</p>
              )}
            </div>
          </div>

          {/* RESUMO LATERAL */}
          <aside className="hidden lg:block">
            <ResumoLateral
              items={items}
              subtotal={subtotal}
              taxaEntrega={taxaEntrega}
              desconto={desconto}
              totalFinal={totalFinal}
              addItem={addItem}
            />
          </aside>
        </div>
      </main>

      {/* RESUMO MOBILE */}
      <ResumoMobile items={items} totalFinal={totalFinal} />
    </div>
  );
};

export default CheckoutPage;
