// src/components/checkout/UpsellBox.jsx
import React from "react";

const UpsellBox = ({ addItem }) => {
  if (!addItem) return null;

  return (
    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] space-y-2">
      <p className="font-semibold text-amber-900">Faltou a bebida?</p>
      <p className="text-amber-800">
        Complete seu pedido com um dos itens rápidos abaixo:
      </p>

      <div className="space-y-1">
        <button
          type="button"
          onClick={() =>
            addItem({
              id: `bebida-coca-2l-${Date.now()}`,
              nome: "Coca-Cola 2L",
              tamanho: "unico",
              quantidade: 1,
              precoUnitario: 12,
            })
          }
          className="w-full text-left px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100"
        >
          Coca-Cola 2L — R$ 12,00
        </button>

        <button
          type="button"
          onClick={() =>
            addItem({
              id: `bebida-agua-${Date.now()}`,
              nome: "Água mineral 500ml",
              tamanho: "unico",
              quantidade: 1,
              precoUnitario: 4,
            })
          }
          className="w-full text-left px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100"
        >
          Água mineral 500ml — R$ 4,00
        </button>
      </div>
    </div>
  );
};

export default UpsellBox;
