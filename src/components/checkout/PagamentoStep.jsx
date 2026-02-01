import React, { useEffect, useState } from "react";

const PagamentoStep = ({
  subtotal,
  taxaEntrega,
  desconto,
  totalFinal,
  pagamento,
  setPagamento,

  // PIX
  pixPayment,
  pixLoading,
  pixError,
  onCreatePix,

  // Cartão (AXIONEPAY) - opcionais
  cardLoading,
  cardError,
  cardCheckoutUrl,
}) => {
  // ======================
  // PIX
  // ======================
  const [pixCopied, setPixCopied] = useState(false);
  const [pixRemainingMs, setPixRemainingMs] = useState(null);

  const pixCode = pixPayment?.copiaColar || pixPayment?.qrcode || "";
  const pixExpiresAt = pixPayment?.expiresAt || "";

  const pixReady = Boolean(pixCode);

  const formatPixExpiresAt = (value) => {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  const formatRemaining = (ms) => {
    if (!Number.isFinite(ms) || ms <= 0) return "00:00";
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(
        seconds
      ).padStart(2, "0")}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const pixExpired = pixRemainingMs === 0;
  const pixExpiringSoon =
    pixRemainingMs != null &&
    pixRemainingMs > 0 &&
    pixRemainingMs <= 2 * 60 * 1000;

  const pixButtonLabel = pixReady
    ? pixRemainingMs === 0
      ? "Regerar Pix"
      : "Pix gerado"
    : pixLoading
    ? "Gerando Pix..."
    : "Gerar Pix";

  const pixCopyLabel = pixCopied ? "Código copiado" : "Copiar código";
  const pixExpiresLabel = pixExpiresAt ? formatPixExpiresAt(pixExpiresAt) : "";
  const pixCountdownLabel =
    pixRemainingMs == null ? "" : formatRemaining(pixRemainingMs);

  useEffect(() => {
    if (!pixExpiresAt) {
      setPixRemainingMs(null);
      return;
    }
    const parsed = new Date(pixExpiresAt);
    if (Number.isNaN(parsed.getTime())) {
      setPixRemainingMs(null);
      return;
    }

    const tick = () => {
      const diff = parsed.getTime() - Date.now();
      setPixRemainingMs(Math.max(0, diff));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [pixExpiresAt]);

  const handleCopyPix = async () => {
    if (!pixCode || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      setPixCopied(true);
      window.setTimeout(() => setPixCopied(false), 2000);
    } catch {
      setPixCopied(false);
    }
  };

  const handleCreatePix = () => {
    if (!onCreatePix) return;
    if (pixReady && !pixExpired) return;
    onCreatePix({ force: pixExpired });
  };

  // ======================
  // CARTÃO (AXIONEPAY)
  // ======================
  const cardReady = Boolean(cardCheckoutUrl);

  // ======================
  // RENDER
  // ======================
  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-lg">Pagamento e finalização</h2>

      {/* Seleção de forma de pagamento */}

        {/* Seleção de forma de pagamento com ícones */}
        <div className="grid sm:grid-cols-3 gap-4 text-xs">
          {["pix", "cartao", "dinheiro"].map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setPagamento(tipo)}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition shadow-sm min-h-[90px] ${
                pagamento === tipo
                  ? "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-700 scale-105 shadow-lg"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="mb-1">
                {tipo === "pix" && (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="mx-auto"><rect width="24" height="24" rx="6" fill="#10B981"/><path d="M7.5 12l2.5 2.5L16.5 8.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
                {tipo === "cartao" && (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="mx-auto"><rect width="24" height="24" rx="6" fill="#2563EB"/><rect x="4" y="8" width="16" height="8" rx="2" fill="#fff"/><rect x="4" y="8" width="16" height="3" fill="#dbeafe"/><rect x="7" y="14" width="3" height="1.5" rx="0.75" fill="#2563EB"/></svg>
                )}
                {tipo === "dinheiro" && (
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="mx-auto"><rect width="24" height="24" rx="6" fill="#fbbf24"/><path d="M7 12c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4-4-1.79-4-4zm4-6C7.48 6 4 9.48 4 14c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2 0-4.52-3.48-8-8-8z" fill="#fff"/></svg>
                )}
              </span>
              <span className="font-semibold">
                {tipo === "pix" && "Pix (recomendado)"}
                {tipo === "cartao" && "Cartão (Pagar Agora)"}
                {tipo === "dinheiro" && "Dinheiro"}
              </span>
            </button>
          ))}
        </div>


      {/* PIX */}
      {pagamento === "pix" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs space-y-4 shadow-sm">
          {/* Tag Powered by AxionPAY */}
          <div className="flex justify-center mb-2">
            <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 text-white text-[13px] font-bold shadow-md border-2 border-white uppercase tracking-widest powered-by-axionpay-text">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#2563EB"/><rect x="4" y="8" width="16" height="8" rx="2" fill="#fff"/><rect x="4" y="8" width="16" height="3" fill="#dbeafe"/><rect x="7" y="14" width="3" height="1.5" rx="0.75" fill="#2563EB"/></svg>
              POWERED BY <span className="font-black tracking-tight ml-1">AXIONPAY</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Pagamento via Pix
              </div>
              <p className="text-[11px] text-slate-500">
                Gere um QR Code ou código copia e cola para pagar pelo seu
                banco.
              </p>
            </div>

            {pixCountdownLabel && (
              <div className="text-right text-[10px] text-slate-500">
                <p className="uppercase tracking-[0.2em]">Tempo restante</p>
                <p className="text-sm font-semibold">
                  {pixExpired ? "Expirado" : pixCountdownLabel}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleCreatePix}
              disabled={pixLoading || (pixReady && !pixExpired)}
              className="
                rounded-full border border-slate-200 px-4 py-2 text-[11px]
                font-semibold uppercase tracking-wide text-slate-700
                transition hover:border-slate-300 hover:bg-slate-50
                disabled:cursor-not-allowed disabled:opacity-60
              "
            >
              {pixButtonLabel}
            </button>

            {pixError && (
              <p className="text-[11px] text-amber-700">{pixError}</p>
            )}

            {pixReady && (
              <>
                {pixCountdownLabel && (
                  <div
                    className={`rounded-xl border px-4 py-3 text-center ${
                      pixExpired
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : pixExpiringSoon
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.3em]">
                      Tempo restante
                    </p>
                    <p className="text-2xl font-black tracking-wide">
                      {pixExpired ? "Expirado" : pixCountdownLabel}
                    </p>
                    {pixExpiresLabel && (
                      <p className="text-[10px] text-slate-500">
                        Expira em: {pixExpiresLabel}
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[11px] text-slate-500">
                    Código copia e cola
                  </label>
                  <textarea
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px]"
                    value={pixCode}
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="rounded-full border border-slate-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      {pixCopyLabel}
                    </button>
                    {!pixCountdownLabel && pixExpiresLabel && (
                      <span className="text-[10px] text-slate-500">
                        Válido até: {pixExpiresLabel}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Abra o app do seu banco, escolha Pix copia e cola e cole o
                  código acima.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Cartão (AXIONEPAY) */}
      {pagamento === "cartao" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs space-y-4 shadow-sm">
          {/* Tag Powered by AxionPAY premium */}
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 text-white text-[13px] font-bold shadow-md border-2 border-white uppercase tracking-widest powered-by-axionpay-text">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="6" fill="#2563EB"/><rect x="4" y="8" width="16" height="8" rx="2" fill="#fff"/><rect x="4" y="8" width="16" height="3" fill="#dbeafe"/><rect x="7" y="14" width="3" height="1.5" rx="0.75" fill="#2563EB"/></svg>
              POWERED BY <span className="font-black tracking-tight ml-1">AXIONPAY</span>
            </span>
          </div>
          {/* Skeleton cartão de crédito */}
          <div className="flex justify-center mb-3">
            <div className="w-64 h-36 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-300 shadow-inner flex flex-col justify-between p-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="w-12 h-6 bg-blue-200 rounded"></div>
                <div className="w-8 h-8 bg-blue-300 rounded-full"></div>
              </div>
              <div className="h-4 bg-blue-200 rounded w-3/4 mb-2"></div>
              <div className="flex justify-between">
                <div className="h-3 bg-blue-200 rounded w-1/3"></div>
                <div className="h-3 bg-blue-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
              <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
              Cartao de credito
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[10px] font-semibold ${
                cardLoading
                  ? "bg-amber-50 text-amber-700"
                  : cardReady
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  cardLoading
                    ? "bg-amber-400 animate-pulse"
                    : cardReady
                    ? "bg-emerald-500"
                    : "bg-slate-400"
                }`}
              />
              Ao finalizar o pedido, o cliente sera redirecionado para o pagamento seguro.
            </div>
            {cardError && (
              <p className="text-[12px] text-rose-700 font-semibold mt-2">{cardError}</p>
            )}
          </div>
        </div>
      )}

      {/* Resumo do pedido */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm space-y-2">
        <p className="flex justify-between">
          <span>Subtotal</span>
          <b>R$ {subtotal.toFixed(2).replace(".", ",")}</b>
        </p>
        <p className="flex justify-between">
          <span>Taxa de entrega</span>
          <b>R$ {taxaEntrega.toFixed(2).replace(".", ",")}</b>
        </p>
        {desconto > 0 && (
          <p className="flex justify-between text-emerald-600">
            <span>Desconto</span>
            <b>- R$ {desconto.toFixed(2).replace(".", ",")}</b>
          </p>
        )}
        <hr />
        <p className="flex justify-between text-lg font-semibold">
          <span>Total</span>
          <span>R$ {totalFinal.toFixed(2).replace(".", ",")}</span>
        </p>
      </div>
    </div>
  );
};

export default PagamentoStep;
