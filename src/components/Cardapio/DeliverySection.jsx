// src/components/Cardapio/DeliverySection.jsx
import React from 'react';

const DeliverySection = ({
  horarioAbertura,
  deliveryStatus,
  deliveryMode,
  setDeliveryMode,
  isRequestingLocation,
  manualAddress,
  setManualAddress,
  handleUseLocation,
  handleManualAddressCheck,
  deliveryDistanceText,
  deliveryDurationText,
  deliveryReference,
  normalizedCurrentAddress,
  startEditCurrentAddress,
  saveCurrentAddress,
  savedCurrentAddress,
  addressNickname,
  setAddressNickname,
  isEditingCurrentAddress,
  editAddressValue,
  setEditAddressValue,
  applyEditCurrentAddress,
  cancelEditCurrentAddress,
  saveFeedback,
  savedAddresses,
  visibleSavedAddresses,
  removeSavedAddress,
  showAllSavedAddresses,
  setShowAllSavedAddresses,
  updateMapFromCoords,
  setDeliveryDistanceText,
  setDeliveryDurationText,
  setDeliveryReference,
  setDeliveryStatus,
  setDeliveryMessage,
  addAddressToBook,
  setManualAddressState,
  setDeliveryAddress,
  setLiveAddressLine,
  persistCheckoutAddress,
  mapEmbedUrl,
  currentCoords,
  GOOGLE_MAPS_API_KEY,
  mapContainerRef,
  deliveryAddress,
  liveAddressLine,
  deliveryMessage,
}) => {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-white shadow-md">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-200" />
              Aberto agora
            </span>
            <span className="text-[11px] text-slate-500">
              {horarioAbertura ? horarioAbertura : (
                <span className="inline-block h-4 w-32 animate-pulse rounded bg-slate-100 align-middle" />
              )}
            </span>
          </div>
          {deliveryStatus === "ok" && (
            <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2 py-[4px] text-[10px] font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Entrega disponível para sua região
            </span>
          )}
          {deliveryStatus === "error" && (
            <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-red-50 px-2 py-[4px] text-[10px] font-semibold text-red-700">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              Problema ao validar endereço
            </span>
          )}
        </div>
      </div>

      {/* MODO + BLOCO ENTREGA */}
      <div className="mt-4 space-y-4 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-sm">
        {/* MODO */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              Modo
            </span>
            <p className="text-xs text-slate-500">
              Escolha se deseja receber em casa ou retirar na pizzaria.
            </p>
          </div>
          <div className="inline-flex rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setDeliveryMode("delivery")}
              className={`rounded-full px-4 py-1.5 text-[11px] font-semibold transition ${
                deliveryMode === "delivery"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Entrega
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMode("pickup")}
              className={`rounded-full px-4 py-1.5 text-[11px] font-semibold transition ${
                deliveryMode === "pickup"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600"
              }`}
            >
              Retirada
            </button>
          </div>
        </div>

        {/* BLOCO ENTREGA */}
        {deliveryMode === "delivery" && (
          <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex flex-col gap-0.5">
                <span className="font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Entrega
                </span>
                <span className="text-slate-500">
                  Informe sua localização para calcular taxa e tempo.
                </span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  Raio máximo
                </span>
                <span className="text-[11px] font-semibold text-slate-700">
                  15 km
                </span>
              </div>
            </div>

            {/* BOTÕES PRINCIPAIS */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={isRequestingLocation}
                className="h-9 w-full rounded-full bg-emerald-600 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRequestingLocation
                  ? "Buscando localização..."
                  : "Usar minha localização"}
              </button>

              <div className="flex h-9 w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs">
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(event) =>
                    setManualAddress(event.target.value)
                  }
                  placeholder="Rua, número, bairro ou CEP"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleManualAddressCheck();
                    }
                  }}
                  className="min-w-0 flex-1 bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={handleManualAddressCheck}
                  className="h-7 shrink-0 rounded-full border border-slate-200 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Calcular
                </button>
              </div>
            </div>

            {/* RESUMO DISTÂNCIA / REFERÊNCIA */}
            <div className="space-y-1 text-[11px] text-slate-600">
              {deliveryDistanceText && (
                <p>
                  <span className="font-semibold">Distância:</span>{" "}
                  {deliveryDistanceText}
                  {deliveryDurationText ? ` · ${deliveryDurationText}` : ""}
                </p>
              )}
              {deliveryReference && (
                <p>
                  <span className="font-semibold">Referência:</span>{" "}
                  {deliveryReference}
                </p>
              )}
            </div>

            {deliveryStatus === "ok" && normalizedCurrentAddress && (
              <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-800">
                      Salvar endereco atual
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Adicione um apelido para encontrar rapido.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={startEditCurrentAddress}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={saveCurrentAddress}
                      disabled={
                        !!savedCurrentAddress && !addressNickname.trim()
                      }
                      className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {savedCurrentAddress
                        ? addressNickname.trim()
                          ? "Atualizar"
                          : "Salvo"
                        : "Salvar"}
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={addressNickname}
                    onChange={(event) =>
                      setAddressNickname(event.target.value)
                    }
                    placeholder="Apelido (ex: Casa, Trabalho)"
                    className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700 outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200"
                  />
                  {savedCurrentAddress?.nickname && !addressNickname.trim() && (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">
                      Salvo como: {savedCurrentAddress.nickname}
                    </span>
                  )}
                </div>
                {isEditingCurrentAddress && (
                  <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px]">
                    <p className="font-semibold text-slate-700">
                      Ajustar endereco
                    </p>
                    <input
                      type="text"
                      value={editAddressValue}
                      onChange={(event) =>
                        setEditAddressValue(event.target.value)
                      }
                      placeholder="Edite o endereco para refinar a entrega"
                      className="mt-2 w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-700 outline-none focus:border-emerald-300 focus:ring-1 focus:ring-emerald-200"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={applyEditCurrentAddress}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100"
                      >
                        Salvar ajuste
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditCurrentAddress}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                {saveFeedback && (
                  <p className="mt-2 text-[10px] font-semibold text-emerald-700">
                    {saveFeedback}
                  </p>
                )}
              </div>
            )}

            {/* ENDERECOS SALVOS */}
            {savedAddresses.length > 0 && (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Enderecos salvos
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Toque para aplicar no calculo de entrega.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                    {savedAddresses.length} item
                    {savedAddresses.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="mt-3 grid gap-2">
                  {visibleSavedAddresses.map((entry) => (
                    <div
                      key={entry.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setManualAddress(entry.label);
                        setDeliveryAddress(entry.label);
                        setLiveAddressLine(entry.label);
                        persistCheckoutAddress(entry.label);
                        if (entry.coords) {
                          updateMapFromCoords(entry.coords);
                        }
                        setDeliveryDistanceText("~1,8 km");
                        setDeliveryDurationText("~6 minutos");
                        setDeliveryReference("Endereco salvo");
                        setDeliveryStatus("ok");
                        setDeliveryMessage(
                          "Entrega disponivel para o endereco salvo."
                        );
                        addAddressToBook(
                          entry.label,
                          entry.coords,
                          entry.nickname || ""
                        );
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setManualAddress(entry.label);
                          setDeliveryAddress(entry.label);
                          setLiveAddressLine(entry.label);
                          persistCheckoutAddress(entry.label);
                          if (entry.coords) {
                            updateMapFromCoords(entry.coords);
                          }
                          setDeliveryDistanceText("~1,8 km");
                          setDeliveryDurationText("~6 minutos");
                          setDeliveryReference("Endereco salvo");
                          setDeliveryStatus("ok");
                          setDeliveryMessage(
                            "Entrega disponivel para o endereco salvo."
                          );
                          addAddressToBook(
                            entry.label,
                            entry.coords,
                            entry.nickname || ""
                          );
                        }
                      }}
                      className="relative rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/30 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          removeSavedAddress(entry.id);
                        }}
                        className="absolute right-3 top-3 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-[10px] font-bold text-slate-500 shadow-sm hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="Remover endereco"
                      >
                        x
                      </button>
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M12 22s7-5.1 7-12a7 7 0 10-14 0c0 6.9 7 12 7 12z"
                              stroke="currentColor"
                              strokeWidth="1.6"
                            />
                            <circle
                              cx="12"
                              cy="10"
                              r="2.6"
                              stroke="currentColor"
                              strokeWidth="1.6"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[12px] font-semibold text-slate-800">
                            {entry.title || entry.label}
                          </p>
                          {entry.subtitle && (
                            <p className="line-clamp-2 text-[10px] text-slate-500">
                              {entry.subtitle}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                            {entry.nickname && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                                {entry.nickname}
                              </span>
                            )}
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                              Usar
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {savedAddresses.length > 2 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSavedAddresses((prev) => !prev)}
                    className="mt-2 w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-600 hover:bg-slate-50"
                  >
                    {showAllSavedAddresses ? "Mostrar menos" : "Ver mais enderecos"}
                  </button>
                )}
              </div>
            )}

            {/* MAPA */}
            {(mapEmbedUrl || (currentCoords && GOOGLE_MAPS_API_KEY)) && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                {GOOGLE_MAPS_API_KEY && currentCoords ? (
                  <div
                    ref={mapContainerRef}
                    className="h-44 w-full border-0"
                  />
                ) : (
                  <iframe
                    title="Mapa da entrega"
                    src={mapEmbedUrl}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="h-40 w-full border-0"
                  />
                )}
                {(deliveryAddress || liveAddressLine) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2 pt-2 text-[10px] text-slate-600">
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase tracking-[0.2em] text-slate-400">
                        Endereco atual
                      </p>
                      <p className="truncate font-semibold text-slate-700">
                        {liveAddressLine || deliveryAddress}
                      </p>
                      {GOOGLE_MAPS_API_KEY && currentCoords && (
                        <p className="text-[9px] text-slate-500">
                          Arraste o pino para ajustar o endereco.
                        </p>
                      )}
                    </div>
                    {currentCoords && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${currentCoords.lat},${currentCoords.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 hover:bg-emerald-50"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M12 21s6-4.4 6-10a6 6 0 10-12 0c0 5.6 6 10 6 10z"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                          <circle
                            cx="12"
                            cy="11"
                            r="2.5"
                            stroke="currentColor"
                            strokeWidth="1.6"
                          />
                        </svg>
                        Mapa
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* MENSAGEM DE STATUS */}
            <div className="pt-1 text-[11px] font-semibold">
              {deliveryStatus === "loading" && (
                <p className="text-slate-500">{deliveryMessage}</p>
              )}
              {deliveryStatus === "error" && (
                <p className="text-red-600">{deliveryMessage}</p>
              )}
              {deliveryStatus === "idle" && !deliveryMessage && (
                <p className="text-slate-500">
                  Informe um endereco para validar a entrega.
                </p>
              )}
            </div>
          </div>
        )}

        {deliveryMode === "pickup" && (
          <p className="text-[11px] font-semibold text-emerald-600">
            Retirada na loja sem taxa de entrega.
          </p>
        )}
      </div>
    </section>
  );
};

export default DeliverySection;