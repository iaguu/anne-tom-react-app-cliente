// src/components/DiscountWheel.jsx
import React, { useEffect, useMemo, useState } from "react";

const buildStorageKey = (phone) =>
  phone ? `at_discount_wheel_${phone}` : "at_discount_wheel";

const PRIZES = [
  { label: "5% OFF", code: "BEMVINDO5", description: "5% de desconto no seu primeiro pedido" },
  { label: "7% OFF", code: "BEMVINDO7", description: "7% de desconto no seu primeiro pedido" },
  { label: "10% OFF", code: "BEMVINDO10", description: "10% de desconto no seu primeiro pedido" },
  { label: "12% OFF", code: "BEMVINDO12", description: "12% de desconto no seu primeiro pedido" },
  { label: "15% OFF", code: "BEMVINDO15", description: "15% de desconto no seu primeiro pedido" },
  { label: "Frete 0", code: "FRETEGRATIS", description: "Frete grátis (consulte bairros participantes)" },
];

const DiscountWheel = ({ phone, onFinished }) => {
  const storageKey = useMemo(() => buildStorageKey(phone), [phone]);
  const [hasSpun, setHasSpun] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHasSpun(true);
        setResult(parsed);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  const handleSpin = () => {
    if (spinning || hasSpun) return;

    setSpinning(true);
    setTimeout(() => {
      const prize =
        PRIZES[Math.floor(Math.random() * PRIZES.length)] || PRIZES[0];
      setResult(prize);
      setHasSpun(true);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(prize));
      } catch {
        // ignore
      }
      setSpinning(false);
    }, 1200);
  };

  const handleFinishClick = () => {
    if (onFinished && result) {
      onFinished(result);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="relative h-20 w-20 flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 opacity-90 shadow-lg" />
          <div className="absolute inset-2 rounded-full border border-white/80 bg-white/10 backdrop-blur" />
          <div
            className={[
              "absolute inset-4 flex items-center justify-center text-xs font-bold text-white",
              spinning ? "animate-spin" : "",
            ].join(" ")}
          >
            GIRE
          </div>
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-4 w-2 rounded-b-full bg-amber-300 shadow-sm" />
        </div>

        <div className="flex-1 text-xs">
          <p className="font-semibold text-emerald-900">
            Roleta de boas-vindas
          </p>
          {!hasSpun && (
            <p className="mt-1 text-[11px] text-emerald-800">
              Clientes novos ganham um cupom exclusivo. Clique em{" "}
              <strong>Girar</strong> para desbloquear seu desconto.
            </p>
          )}
          {hasSpun && result && (
            <p className="mt-1 text-[11px] text-emerald-900">
              Você desbloqueou:{" "}
              <span className="font-semibold">{result.label}</span> –{" "}
              {result.description}
            </p>
          )}

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={handleSpin}
              disabled={spinning || hasSpun}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
            >
              {spinning
                ? "Girando..."
                : hasSpun
                ? "Cupom sorteado"
                : "Girar roleta"}
            </button>
            {hasSpun && result && (
              <button
                type="button"
                onClick={handleFinishClick}
                className="inline-flex items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
              >
                Usar cupom
              </button>
            )}
          </div>

          {hasSpun && result && (
            <p className="mt-1 text-[10px] text-emerald-900">
              Mostre este cupom ao atendente ou informe o código no campo de
              observações na finalização do pedido.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscountWheel;
