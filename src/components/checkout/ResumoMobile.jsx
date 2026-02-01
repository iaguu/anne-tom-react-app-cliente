// src/components/checkout/ResumoMobile.jsx
import React, { useState } from "react";

const ResumoMobile = ({ items, totalFinal }) => {
  const [aberto, setAberto] = useState(false);
  if (!items.length) return null;

  return (
    <>
      <button
        type="button"
        className="lg:hidden fixed bottom-4 right-4 z-40 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-lg"
        onClick={() => setAberto(true)}
      >
        Ver resumo (R$ {totalFinal.toFixed(2).replace(".", ",")})
      </button>

      {aberto && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40 flex items-end">
          <div className="w-full bg-white rounded-t-3xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm font-semibold">Resumo do pedido</p>
              <button
                className="text-[11px] text-slate-500"
                onClick={() => setAberto(false)}
              >
                Fechar
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto text-xs">
              <ul className="divide-y divide-slate-200">
                {items.map((item) => (
                  <li
                    key={`${item.id}-${item.tamanho}`}
                    className="py-2 flex justify-between gap-3"
                  >
                    <div>
                      <p className="font-semibold">
                        {item.quantidade}x {item.nome}
                      </p>
                    </div>
                    <p className="text-slate-700">
                      R$ {(item.precoUnitario * item.quantidade)
                        .toFixed(2)
                        .replace(".", ",")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <p className="flex justify-between text-sm font-semibold">
              <span>Total</span>
              <span>
                R$ {totalFinal.toFixed(2).replace(".", ",")}
              </span>
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ResumoMobile;
