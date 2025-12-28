// src/components/checkout/PagamentoStep.jsx
import React, { useEffect, useState } from "react";

const PagamentoStep = ({
  subtotal,
  taxaEntrega,
  desconto,
  totalFinal,
  pagamento,
  setPagamento,
  pixPayment,
  pixLoading,
  pixError,
  onCreatePix,
}) => {
  const [pixCopied, setPixCopied] = useState(false);
  const pixCode = pixPayment?.copiaColar || pixPayment?.qrcode || "";
  const pixExpiresAt = pixPayment?.expiresAt || "";
  const pixReady = Boolean(pixCode);
  const [pixRemainingMs, setPixRemainingMs] = useState(null);

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
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
        2,
        "0"
      )}`;
    }
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const pixButtonLabel = pixReady
    ? pixRemainingMs === 0
      ? "Regerar Pix"
      : "Pix gerado"
    : pixLoading
    ? "Gerando Pix..."
    : "Gerar Pix";
  const pixCopyLabel = pixCopied ? "Codigo copiado" : "Copiar codigo";
  const pixExpiresLabel = pixExpiresAt
    ? formatPixExpiresAt(pixExpiresAt)
    : "";
  const pixCountdownLabel =
    pixRemainingMs == null ? "" : formatRemaining(pixRemainingMs);
  const pixExpired = pixRemainingMs === 0;
  const pixExpiringSoon =
    pixRemainingMs != null && pixRemainingMs > 0 && pixRemainingMs <= 2 * 60 * 1000;

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
    } catch (_err) {
      setPixCopied(false);
    }
  };

  const handleCreatePix = () => {
    if (!onCreatePix) return;
    if (pixReady && !pixExpired) return;
    onCreatePix({ force: pixExpired });
  };
  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-lg">Pagamento e finalização</h2>

      <div className="grid sm:grid-cols-3 gap-4 text-xs">
        {["pix", "cartao", "dinheiro"].map((tipo) => (
          <button
            key={tipo}
            type="button"
            onClick={() => setPagamento(tipo)}
            className={`p-3 rounded-xl border transition ${
              pagamento === tipo
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tipo === "pix" && "Pix (recomendado)"}
            {tipo === "cartao" && "Cartão (maquininha na entrega)"}
            {tipo === "dinheiro" && "Dinheiro"}
          </button>
        ))}
      </div>

      {pagamento === "pix" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs space-y-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Pix instantaneo
              </div>
              <p className="text-[11px] text-slate-500">
                Gere o codigo para pagar direto no seu banco.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCreatePix}
              disabled={pixLoading || (pixReady && !pixExpired)}
              className="rounded-full border border-slate-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pixButtonLabel}
            </button>
          </div>

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
                  Codigo copia e cola
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
                      Valido ate: {pixExpiresLabel}
                    </span>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Abra seu banco, escolha Pix copia e cola e cole o codigo acima.
              </p>
            </>
          )}
        </div>
      )}

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
