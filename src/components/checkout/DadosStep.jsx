// src/components/checkout/DadosStep.jsx
import React from "react";
import { getTaxaPorBairro } from "../../utils/deliveryFees";

const DadosStep = ({
  dados,
  setDados,
  cupom,
  setCupom,
  aplicarCupom,
  buscarCep,
  buscandoCep,
  erroCep,
  checandoCliente,
  clienteExistente,
  erroClienteApi,
  onBuscarClientePorTelefone,
  tipoCliente,
  setTipoCliente,
  deliveryEta,
  deliveryEtaLoading,
  deliveryEtaError,
  distanceFee,
  deliveryFeeLabel,
}) => {
  const taxaBairro = dados.retirada ? 0 : getTaxaPorBairro(dados.bairro);

  const getPhoneDigits = (value) => value.replace(/\D/g, "").slice(0, 11);

  const maskPhone = (value) => {
    const digits = getPhoneDigits(value);
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length <= 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(
        6
      )}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

const handleTelefoneChange = (e) => {
  const raw = e.target.value;
  const masked = maskPhone(raw);
  setDados({ ...dados, telefone: masked });
};

const phoneDigits = getPhoneDigits(dados.telefone);
const liberarCampos =
  phoneDigits.length >= 10 &&
  (tipoCliente === "existing" || tipoCliente === "novo");

// auto-consulta na API quando é "Já sou cliente"
React.useEffect(() => {
  // só consulta para "Já sou cliente"
  if (tipoCliente !== "existing") return;
  if (!onBuscarClientePorTelefone) return;

  // precisa ter pelo menos 10 dígitos
  if (phoneDigits.length < 10) return;

  // se já estiver consultando, não agenda outra
  if (checandoCliente) return;

  const timeout = setTimeout(() => {
    // aqui usamos o telefone mascarado, o hook trata os dígitos
    onBuscarClientePorTelefone(dados.telefone);
  }, 800); // debounce mais curto e responsivo

  return () => clearTimeout(timeout);
}, [
  tipoCliente,
  phoneDigits,
  checandoCliente,
  onBuscarClientePorTelefone,
  dados.telefone,
]);

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-lg">Dados e entrega</h2>

      {/* PERGUNTA PRINCIPAL */}
      <section className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">
            Você já é cliente Anne &amp; Tom?
          </p>
          <p className="text-[11px] text-slate-500">
            Escolha uma opção abaixo e digite seu telefone para continuarmos.
          </p>
        </div>
        <div className="inline-flex rounded-full bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setTipoCliente("existing")}
            className={`px-3 py-1 rounded-full text-[11px] ${
              tipoCliente === "existing"
                ? "bg-slate-900 text-white"
                : "text-slate-700"
            }`}
          >
            Já sou cliente
          </button>
          <button
            type="button"
            onClick={() => setTipoCliente("novo")}
            className={`px-3 py-1 rounded-full text-[11px] ${
              tipoCliente === "novo"
                ? "bg-slate-900 text-white"
                : "text-slate-700"
            }`}
          >
            Primeira vez aqui
          </button>
        </div>
      </section>

      {tipoCliente === "auto" && (
        <p className="text-[11px] text-slate-500">
          Escolha uma das opções acima para começar.
        </p>
      )}

      {/* TELEFONE */}
      {tipoCliente !== "auto" && (
        <div className="space-y-1">
          <input
            type="text"
            placeholder="Telefone / WhatsApp"
            value={dados.telefone}
            onChange={handleTelefoneChange}
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300"
          />

          {tipoCliente === "existing" && (
            <>
              {checandoCliente && (
                <p className="text-[11px] text-slate-500">
                  Buscando seu cadastro...
                </p>
              )}
              {clienteExistente && !checandoCliente && (
                <div className="mt-1 p-2 rounded-lg border border-emerald-200 bg-emerald-50 text-[11px] text-emerald-800">
                  <p className="font-semibold">
                    Cliente encontrado: {clienteExistente.name}
                  </p>
                  {clienteExistente.address && (
                    <p className="mt-0.5">
                      {clienteExistente.address.street} -{" "}
                      {clienteExistente.address.neighborhood}
                    </p>
                  )}
                </div>
              )}
              {erroClienteApi && !checandoCliente && (
                <p className="text-[11px] text-orange-600">
                  {erroClienteApi}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {tipoCliente !== "auto" && !liberarCampos && (
        <p className="text-[11px] text-slate-400">
          Digite seu telefone com DDD para liberar o restante dos dados.
        </p>
      )}

      {/* FORM ANIMADO */}
      <div
        className={`transition-all duration-300 ease-out origin-top ${
          liberarCampos
            ? "opacity-100 max-h-[1000px] translate-y-0"
            : "opacity-0 max-h-0 -translate-y-1 overflow-hidden pointer-events-none"
        } space-y-4`}
      >
        <input
          type="text"
          placeholder="Nome completo"
          value={dados.nome}
          onChange={(e) => setDados({ ...dados, nome: e.target.value })}
          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300"
        />

        <div className="grid md:grid-cols-[2fr_1fr] gap-3 items-center">
          <input
            type="text"
            placeholder="CEP"
            value={dados.cep}
            onChange={(e) => setDados({ ...dados, cep: e.target.value })}
            onBlur={buscarCep}
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300"
          />
          <button
            type="button"
            onClick={buscarCep}
            disabled={buscandoCep}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-60"
          >
            {buscandoCep ? "Buscando CEP..." : "Recarregar pelo CEP"}
          </button>
        </div>

        {erroCep && (
          <p className="text-[11px] text-red-500">{erroCep}</p>
        )}

        <textarea
          placeholder="Endereço completo (rua, número, complemento, cidade, UF)"
          value={dados.endereco}
          onChange={(e) =>
            setDados({ ...dados, endereco: e.target.value })
          }
          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300"
        />

        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              {dados.bairro ? (
                <>
                  <p className="font-semibold text-slate-800">
                    Bairro detectado: {dados.bairro}
                  </p>
                  {!dados.retirada && distanceFee != null && (
                    <p className="mt-1 text-[11px] text-emerald-700">
                      Taxa calculada por {deliveryFeeLabel}:{" "}
                      <strong>
                        R${" "}
                        {distanceFee.toFixed(2).replace(".", ",")}
                      </strong>
                    </p>
                  )}
                  {!dados.retirada && distanceFee == null && (
                    <p className="mt-1 text-[11px] text-slate-600">
                      Taxa de entrega:{" "}
                      <strong>
                        R${" "}
                        {taxaBairro.toFixed(2).replace(".", ",")}
                      </strong>{" "}
                      (calculada automaticamente pelo CEP).
                    </p>
                  )}
                  {!dados.retirada && (
                    <>
                      {deliveryEtaLoading && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          Calculando tempo estimado de entrega...
                        </p>
                      )}
                      {deliveryEta && !deliveryEtaLoading && (
                        <p className="mt-1 text-[11px] text-slate-600">
                          Tempo estimado:{" "}
                          <strong>
                            {deliveryEta.durationText}
                          </strong>{" "}
                          ({deliveryEta.distanceText})
                        </p>
                      )}
                      {deliveryEtaError && !deliveryEtaLoading && (
                        <p className="mt-1 text-[11px] text-amber-600">
                          {deliveryEtaError}
                        </p>
                      )}
                    </>
                  )}
                  {dados.retirada && (
                    <p className="mt-1 text-[11px] text-slate-600">
                      Retirada na loja selecionada: taxa de entrega zerada.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Informe o CEP para localizar o bairro e calcular a taxa
                  automaticamente.
                </p>
              )}
          </div>

          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={dados.retirada}
              onChange={() =>
                setDados((d) => ({ ...d, retirada: !d.retirada }))
              }
            />
            Retirada na loja (remove a taxa de entrega)
          </label>
        </div>

        <textarea
          placeholder="Observações gerais do pedido (ex.: portaria, troco, ponto da borda...)"
          value={dados.obsGerais}
          onChange={(e) =>
            setDados({ ...dados, obsGerais: e.target.value })
          }
          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300"
        />

        <div className="grid md:grid-cols-[2fr_1fr] gap-3 items-center">
          <input
            type="text"
            placeholder="Cupom (ex.: PRIMEIRA)"
            value={cupom}
            onChange={(e) => setCupom(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm"
          />
          <button
            type="button"
            onClick={aplicarCupom}
            className="px-4 py-2 rounded-xl bg-slate-200 text-xs hover:bg-slate-300"
          >
            Aplicar cupom
          </button>
        </div>
      </div>
    </div>
  );
};

export default DadosStep;
