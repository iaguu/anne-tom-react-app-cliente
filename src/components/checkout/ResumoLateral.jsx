// src/components/checkout/ResumoLateral.jsx
import React from "react";
import UpsellBox from "./UpsellBox";

const ResumoLateral = ({
  items,
  subtotal,
  taxaEntrega,
  desconto,
  totalFinal,
  addItem,
}) => {
  if (!items.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs shadow-sm">
        <p className="font-semibold text-slate-800 mb-1">
          Carrinho vazio por enquanto
        </p>
        <p className="text-slate-500">
          Volte ao cardápio e adicione alguns sabores para ver o resumo aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs shadow-sm space-y-3">
      <p className="font-semibold text-slate-800">Resumo do pedido</p>
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
              <p className="text-[11px] text-slate-500">{item.tamanho}</p>
              {Array.isArray(item.sabores) && item.sabores.length > 1 && (
                <p className="text-[11px] text-slate-500">
                  Sabores: {item.sabores.join(" / ")}
                </p>
              )}
              {!item.sabores && item.meio && (
                <p className="text-[11px] text-slate-500">
                  Meio a meio com {item.meio}
                </p>
              )}
              {Array.isArray(item.extras) && item.extras.length > 0 && (
                <p className="text-[11px] text-slate-500">
                  Adicionais: {item.extras.join(", ")}
                </p>
              )}
            </div>
            <p className="text-slate-700">
              R$ {(item.precoUnitario * item.quantidade)
                .toFixed(2)
                .replace(".", ",")}
            </p>
          </li>
        ))}
      </ul>
      <div className="space-y-1 pt-1 border-t border-slate-100">
        <p className="flex justify-between">
          <span>Subtotal</span>
          <span>R$ {subtotal.toFixed(2).replace(".", ",")}</span>
        </p>
        <p className="flex justify-between">
          <span>Entrega</span>
          <span>R$ {taxaEntrega.toFixed(2).replace(".", ",")}</span>
        </p>
        {desconto > 0 && (
          <p className="flex justify-between text-emerald-600">
            <span>Desconto</span>
            <span>- R$ {desconto.toFixed(2).replace(".", ",")}</span>
          </p>
        )}
        <p className="flex justify-between font-semibold pt-1">
          <span>Total</span>
          <span>R$ {totalFinal.toFixed(2).replace(".", ",")}</span>
        </p>
      </div>

      {/* Upsell de bebida */}
      <UpsellBox addItem={addItem} />
    </div>
  );
};

export default ResumoLateral;
