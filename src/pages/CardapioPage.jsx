// src/pages/CardapioPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useMenuData } from "../hooks/useMenuData";
import { formatCurrencyBRL } from "../utils/menu";

import iconVeggieUrl from "../assets/icons/veggie.svg";
import iconBestUrl from "../assets/icons/best.svg";
import iconHotUrl from "../assets/icons/hot.svg";

const WHATSAPP_LINK =
  "https://wa.me/5511932507007?text=Ol%C3%A1%2C+vim+do+card%C3%A1pio+online+e+preciso+de+ajuda+%F0%9F%8D%95";

const LOCATION_STORAGE_KEY = "at_delivery_location";
const ADDRESS_BOOK_STORAGE_KEY = "at_delivery_address_book";
const DELIVERY_MODE_KEY = "at_delivery_mode";
const SEARCH_STORAGE_KEY = "at_menu_search";

// ---------- COMPONENTES AUXILIARES ----------

const ProductCard = ({
  product,
  index,
  quantityInCart = 0,
  onOpenCustomization,
  onShowDetails,
}) => {
  const hasDescription = Boolean(product.descricao || product.description);
  const ingredientes =
    product.ingredientes || product.ingredients || product.composicao || [];

  const mainPrice =
    product.preco_grande ??
    product.preco ??
    product.price ??
    product.valor ??
    0;

  const badge = product.classificacao || product.tag || product.categoria;
  const badges = product.badges || [];

  return (
    <article
      className="cursor-pointer rounded-3xl border border-slate-100 bg-white px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition hover:shadow-lg"
      onClick={onShowDetails}
    >
      <header className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">
            {String(index + 1).padStart(2, "0")} • Pizza
          </p>
          <h3 className="mt-0.5 text-[13px] font-semibold text-slate-900">
            {product.nome || product.name}
          </h3>
          {hasDescription && (
            <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
              {product.descricao || product.description}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
            {formatCurrencyBRL(mainPrice)}
          </span>

          {/* badges principais sempre visíveis */}
          {badges.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1 justify-end">
              {badges.map((b, i) => (
                <span
                  key={i}
                  className="rounded-full border border-[#FF914D]/30 bg-[#FF914D]/10 px-2 py-0.5 text-[10px] font-semibold text-[#FF914D] flex items-center gap-1"
                >
                  {b === "Veggie" && <img src={iconVeggieUrl} alt="Veggie" className="w-3 h-3 inline" />}
                  {b === "Picante" && <img src={iconHotUrl} alt="Picante" className="w-3 h-3 inline" />}
                  {b === "Mais pedido" && <img src={iconBestUrl} alt="Mais pedido" className="w-3 h-3 inline" />}
                  <span>{b}</span>
                </span>
              ))}
            </div>
          )}

          {badge && badges.length === 0 && (
            <span className="mt-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
              {badge}
            </span>
          )}

          {quantityInCart > 0 && (
            <span className="text-[10px] font-semibold text-emerald-700">
              {quantityInCart} no carrinho
            </span>
          )}
        </div>
      </header>

      {ingredientes && ingredientes.length > 0 && (
        <p className="mb-2 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-600">Ingredientes: </span>
          <span>
            {Array.isArray(ingredientes)
              ? ingredientes.join(", ")
              : ingredientes}
          </span>
        </p>
      )}

      <footer className="mt-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          {product.quantidade_sabores && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-[2px]">
              <span className="text-[12px]">🍕</span>
              {product.quantidade_sabores} sabores
            </span>
          )}
          {product.tamanho && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-[2px]">
              <span className="text-[12px]">📏</span>
              {product.tamanho}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenCustomization();
          }}
          className="inline-flex items-center gap-1 rounded-full bg-[#FF914D] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#ff7a21] active:scale-[0.97]"
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/15 text-xs">
            +
          </span>
          Personalizar
        </button>
      </footer>
    </article>
  );
};

const QuickActionsBar = ({ cartCount = 0, hasActiveOrder, onRepeatLastOrder }) => {
  const navigate = useNavigate();

  return (
    <div className="sticky bottom-3 z-30 mt-6">
      <div className="mx-auto flex max-w-md items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.18)] backdrop-blur">
        <button
          type="button"
          onClick={() => window.open(WHATSAPP_LINK, "_blank")}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-emerald-500"
        >
          <span className="text-xs">🧑‍🍳</span>
          Suporte
        </button>

        <button
          type="button"
          onClick={() => navigate("/checkout")}
          className="inline-flex items-center justify-center gap-1 rounded-full bg-[#FF914D] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-white hover:bg-[#ff7a21]"
        >
          <span className="text-xs">🛒</span>
          Carrinho
          {cartCount > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-white/15 px-1 text-[9px] font-bold">
              {cartCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate("/pedidos")}
          className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-200"
        >
          📦
        </button>

        <button
          type="button"
          disabled={!hasActiveOrder}
          onClick={onRepeatLastOrder}
          className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          🔁
        </button>
      </div>
    </div>
  );
};

// ---------- PÁGINA PRINCIPAL ----------

const CardapioPage = () => {
  // Adiciona estados para dados dinâmicos da API
  const { pizzas = [], loadingMenu, menuError, horarioAbertura, bordas = [], extras = [], loadingBordas, loadingExtras } = useMenuData();
  const { items, addItem } = useCart();
  const navigate = useNavigate();

  const [modalPizza, setModalPizza] = useState(null);
  const [toast, setToast] = useState(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todas");

  const [deliveryMode, setDeliveryMode] = useState("delivery");
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [deliveryDistanceText, setDeliveryDistanceText] = useState("");
  const [deliveryDurationText, setDeliveryDurationText] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState("idle"); // idle | loading | ok | error
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [currentCoords, setCurrentCoords] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [mapEmbedUrl, setMapEmbedUrl] = useState("");

  // estados de customização da pizza (modal)
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalSelectedFlavors, setModalSelectedFlavors] = useState([]);
  const [modalSelectedCrust, setModalSelectedCrust] = useState("");
  const [modalSelectedExtras, setModalSelectedExtras] = useState([]);

  const menuTopRef = useRef(null);

  const cartCount = useMemo(
    () =>
      items.reduce(
        (acc, item) => acc + Number(item.quantidade || item.quantity || 0),
        0
      ),
    [items]
  );

  const quantityByPizzaId = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      if (!item.idPizza && !item.id) return;
      const key = item.idPizza || item.id;
      const current = map.get(key) || 0;
      map.set(key, current + Number(item.quantidade || item.quantity || 0));
    });
    return map;
  }, [items]);

  const categories = useMemo(() => {
    const map = new Map();
    pizzas.forEach((pizza) => {
      const label = (pizza.categoria || "Outros").trim();
      const key = label.toLowerCase();
      if (!map.has(key)) {
        map.set(key, label);
      }
    });
    return ["todas", ...map.values()];
  }, [pizzas]);

  const filteredPizzas = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pizzas.filter((pizza) => {
      if (selectedCategory !== "todas") {
        const normalizedCategory = (pizza.categoria || "").toLowerCase();
        if (normalizedCategory !== selectedCategory.toLowerCase()) return false;
      }
      if (!term) return true;
      const haystack = [
        pizza.nome,
        pizza.categoria,
        (pizza.ingredientes || []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [pizzas, selectedCategory, search]);

  const resultsCount = filteredPizzas.length;

  // lista de sabores para multi-select (todas as pizzas)
  const flavorOptions = useMemo(
    () =>
      pizzas.map((pz) => ({
        id: pz.id,
        nome: pz.nome || pz.name,
      })),
    [pizzas]
  );

  // ---------- HELPERS DE LOCALIZAÇÃO / MAPA ----------

  const buildMapEmbedUrl = (coords) => {
    if (!coords || !coords.lat || !coords.lng) return "";
    const center = `${coords.lat},${coords.lng}`;
    const zoom = 16;
    return `https://www.google.com/maps?q=${encodeURIComponent(
      center
    )}&z=${zoom}&output=embed`;
  };

  const updateMapFromCoords = (coords) => {
    if (!coords || !coords.lat || !coords.lng) return;
    setCurrentCoords(coords);
    const url = buildMapEmbedUrl(coords);
    if (url) setMapEmbedUrl(url);
  };

  const addAddressToBook = (label, coords) => {
    if (!label) return;

    setSavedAddresses((prev) => {
      const exists = prev.some((entry) => entry.label === label);
      if (exists) return prev;

      const next = [
        ...prev,
        {
          id: `${Date.now()}-${prev.length + 1}`,
          label,
          coords: coords || null,
        },
      ];

      try {
        localStorage.setItem(ADDRESS_BOOK_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }

      return next;
    });
  };

  const reverseGeocode = async (coords) => {
    if (!coords) return null;

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.lat}&lon=${coords.lng}&accept-language=pt-BR`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "AnneTomCardapio/1.0",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error("[Cardapio] reverse geocode error:", error);
      return null;
    }
  };

  const geocodeAddress = async (address) => {
    if (!address) return null;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        address
      )}&limit=1&accept-language=pt-BR`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "AnneTomCardapio/1.0",
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const first = data && data[0];
      if (!first) return null;
      return {
        lat: Number(first.lat),
        lng: Number(first.lon),
      };
    } catch (error) {
      console.error("[Cardapio] geocode address error:", error);
      return null;
    }
  };

  // ---------- FLUXOS DE CARRINHO ----------

  const addPizzaToCart = (pizza, options = {}) => {
    const quantity = options.quantity ?? 1;
    const saboresIds = options.saboresIds || [];
    const saboresNomes = options.saboresNomes || [];
    const borda = options.borda || null;
    const extras = options.extras || [];

    const basePrice =
      pizza.priceGrande ??
      pizza.preco_grande ??
      pizza.preco ??
      pizza.price ??
      pizza.valor ??
      0;

    // por enquanto não somamos extras no preço; apenas metadados
    const price = basePrice;

    addItem({
      id: pizza.id,
      idPizza: pizza.id,
      nome: pizza.nome || pizza.name,
      quantidade: quantity,
      tamanho: "grande",
      precoUnitario: price,
      price,
      origem: "cardapio",
      saboresIds,
      saboresNomes,
      borda,
      extras,
    });

    setToast({
      message: `${quantity}x ${pizza.nome || pizza.name} adicionada ao carrinho`,
      id: Date.now(),
    });
  };

  const openCustomizationModal = (pizza) => {
    setModalPizza(pizza);
    setModalQuantity(1);
    setModalSelectedExtras([]);
    setModalSelectedCrust("sem_borda");

    // pré-seleciona o sabor da própria pizza
    if (pizza?.id) {
      setModalSelectedFlavors([pizza.id]);
    } else {
      setModalSelectedFlavors([]);
    }
  };

  const handleShowDetails = (pizza) => {
    // modal focado em visual; reaproveitamos mesmo estado
    openCustomizationModal(pizza);
  };

  const handleCloseModal = () => {
    setModalPizza(null);
  };

  const handleConfirmCustomization = () => {
    if (!modalPizza) return;

    const saboresIds = modalSelectedFlavors.slice(0, 3);
    const saboresNomes = saboresIds
      .map((id) => flavorOptions.find((f) => f.id === id)?.nome)
      .filter(Boolean);

    addPizzaToCart(modalPizza, {
      quantity: modalQuantity,
      saboresIds,
      saboresNomes,
      borda: modalSelectedCrust,
      extras: modalSelectedExtras,
    });

    // toast some time and go to checkout
    setTimeout(() => {
      setToast(null);
      navigate("/checkout");
    }, 1400);

    handleCloseModal();
  };

  // ---------- FLUXOS DE ENTREGA ----------

  const handleManualAddressCheck = async () => {
    const value = manualAddress.trim();
    if (!value) {
      setDeliveryStatus("error");
      setDeliveryMessage("Digite um endereço ou CEP para calcular.");
      return;
    }

    setDeliveryStatus("loading");
    setDeliveryMessage("Calculando distância para o endereço informado...");

    setTimeout(async () => {
      const coords = await geocodeAddress(value);
      if (coords) {
        updateMapFromCoords(coords);
        try {
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(coords));
        } catch {
          // ignore
        }
      }

      setDeliveryDistanceText("~1,8 km");
      setDeliveryDurationText("~6 minutos");
      setDeliveryReference("Endereço informado");
      setDeliveryAddress(value);
      addAddressToBook(value, coords || null);
      setDeliveryStatus("ok");
      setDeliveryMessage("Entrega disponível para o endereço informado.");
    }, 400);
  };

  const handleUseLocation = () => {
    if (!navigator?.geolocation) {
      setDeliveryStatus("error");
      setDeliveryMessage("Seu navegador não suporta geolocalização.");
      return;
    }

    setIsRequestingLocation(true);
    setDeliveryStatus("loading");
    setDeliveryMessage("Buscando sua localização...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setIsRequestingLocation(false);
        setDeliveryStatus("loading");
        setDeliveryMessage(
          "Confirmando se sua região está dentro do raio de entrega..."
        );

        updateMapFromCoords(coords);
        try {
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(coords));
        } catch {
          // ignore
        }

        let resolvedAddress = "Sua localização";
        const humanAddress = await reverseGeocode(coords);
        if (humanAddress) resolvedAddress = humanAddress;

        setManualAddress(resolvedAddress);
        setDeliveryAddress(resolvedAddress);
        addAddressToBook(resolvedAddress, coords);

        setTimeout(() => {
          setDeliveryDistanceText("~1,8 km");
          setDeliveryDurationText("~6 minutos");
          setDeliveryReference("Localização salva");
          setDeliveryStatus("ok");
          setDeliveryMessage("Entrega disponível para sua localização.");
        }, 400);
      },
      (error) => {
        console.error("[Cardapio] geolocation error:", error);
        setIsRequestingLocation(false);
        setDeliveryStatus("error");
        setDeliveryMessage(
          "Não foi possível obter sua localização. Verifique as permissões do navegador."
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const hasActiveOrder = false; // ajuste depois se tiver rastreio do último pedido

  // ---------- EFFECTS ----------

  useEffect(() => {
    try {
      const storedSearch = sessionStorage.getItem(SEARCH_STORAGE_KEY);
      if (storedSearch) setSearch(storedSearch);
    } catch {
      // ignore
    }
    try {
      const storedMode = localStorage.getItem(DELIVERY_MODE_KEY);
      if (storedMode === "delivery" || storedMode === "pickup") {
        setDeliveryMode(storedMode);
      }
    } catch {
      // ignore
    }
    try {
      const rawAddresses = localStorage.getItem(ADDRESS_BOOK_STORAGE_KEY);
      if (rawAddresses) {
        const parsed = JSON.parse(rawAddresses);
        if (Array.isArray(parsed)) setSavedAddresses(parsed);
      }
    } catch {
      // ignore
    }
    try {
      const rawLocation = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (rawLocation) {
        const coords = JSON.parse(rawLocation);
        if (coords && coords.lat && coords.lng) {
          updateMapFromCoords(coords);
          reverseGeocode(coords).then((addr) => {
            if (addr) {
              setManualAddress(addr);
              setDeliveryAddress(addr);
              addAddressToBook(addr, coords);
            }
          });
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(SEARCH_STORAGE_KEY, search);
    } catch {
      // ignore
    }
  }, [search]);

  useEffect(() => {
    try {
      localStorage.setItem(DELIVERY_MODE_KEY, deliveryMode);
    } catch {
      // ignore
    }
    if (deliveryMode === "pickup") {
      setDeliveryStatus("idle");
      setDeliveryMessage("");
    }
  }, [deliveryMode]);

  useEffect(() => {
    if (!menuTopRef.current) return;
    window.scrollTo({
      top: window.scrollY + menuTopRef.current.getBoundingClientRect().top - 120,
      behavior: "smooth",
    });
  }, [selectedCategory]);

  // ---------- RENDER ----------

  return (
    <div className="bg-[#FFF7EC]">
      <div className="mx-auto max-w-5xl px-3 py-4 md:px-6 md:py-6">
        {/* STATUS DE FUNCIONAMENTO + ENTREGA */}
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

                {/* ENDEREÇOS SALVOS */}
                {savedAddresses.length > 0 && (
                  <div className="mt-1 space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Endereços salvos
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {savedAddresses.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => {
                            setManualAddress(entry.label);
                            setDeliveryAddress(entry.label);
                            if (entry.coords) {
                              updateMapFromCoords(entry.coords);
                            }
                            setDeliveryDistanceText("~1,8 km");
                            setDeliveryDurationText("~6 minutos");
                            setDeliveryReference("Endereço salvo");
                            setDeliveryStatus("ok");
                            setDeliveryMessage(
                              "Entrega disponível para o endereço salvo."
                            );
                          }}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50"
                        >
                          {entry.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* MAPA */}
                {mapEmbedUrl && (
                  <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                    <iframe
                      title="Mapa da entrega"
                      src={mapEmbedUrl}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                      className="h-40 w-full border-0"
                    />
                    {deliveryAddress && (
                      <div className="flex items-center justify-between px-3 pb-2 pt-1 text-[10px] text-slate-600">
                        <span className="truncate">
                          Entrega para:{" "}
                          <span className="font-semibold">
                            {deliveryAddress}
                          </span>
                        </span>
                        {currentCoords && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${currentCoords.lat},${currentCoords.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 hover:text-emerald-600"
                          >
                            Ver mapa ampliado
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
                  {deliveryStatus === "ok" && (
                    <p className="text-emerald-600">{deliveryMessage}</p>
                  )}
                  {deliveryStatus === "error" && (
                    <p className="text-red-600">{deliveryMessage}</p>
                  )}
                  {deliveryStatus === "idle" && !deliveryMessage && (
                    <p className="text-slate-500">
                      Informe um endereço ou permita a localização para validar
                      a entrega.
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

        {/* CONTROLES DE BUSCA E FILTRO */}
        <section
          ref={menuTopRef}
          className="mt-4 space-y-3 rounded-[28px] border border-slate-200 bg-white/95 px-5 py-5 shadow-sm backdrop-blur"
        >
          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
              <span className="text-lg">🔍</span>
              <input
                type="text"
                placeholder="Buscar por nome ou ingrediente."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="flex-1 bg-transparent text-sm font-medium text-slate-600 outline-none placeholder:text-slate-400"
              />
            </div>
            <select
              className="w-full rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              {categories.map((categoryOption) => (
                <option key={categoryOption} value={categoryOption}>
                  {categoryOption === "todas"
                    ? "Todas as categorias"
                    : categoryOption}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>
              {resultsCount === 0
                ? "Nenhum item encontrado."
                : `${resultsCount} item${
                    resultsCount > 1 ? "s" : ""
                  } encontrado${resultsCount > 1 ? "s" : ""}`}
            </span>
            {(search.trim() || selectedCategory !== "todas") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("todas");
                }}
                className="text-[11px] font-semibold text-[#FF914D] hover:text-[#ff7a21]"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* CHIPS DE CATEGORIA */}
          {categories.length > 1 && (
            <div className="-mx-2 overflow-x-auto no-scrollbar">
              <div className="flex min-w-max gap-2 px-2 pb-1">
                {categories.map((categoryOption) => {
                  const isActive = selectedCategory === categoryOption;
                  const label =
                    categoryOption === "todas" ? "Todas" : categoryOption;
                  return (
                    <button
                      key={categoryOption}
                      type="button"
                      onClick={() => setSelectedCategory(categoryOption)}
                      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                        isActive
                          ? "bg-[#FF914D] text-white border-[#FF914D] shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-[#FFF7F0]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* LISTA DE PRODUTOS */}
        <section className="mt-4 space-y-4 rounded-[28px] border border-slate-200 bg-white/95 px-5 py-5 shadow-sm">
          {loadingMenu && (
            <div className="space-y-3">
              {[1, 2, 3].map((skeleton) => (
                <div
                  key={skeleton}
                  className="h-20 animate-pulse rounded-3xl bg-slate-100/70"
                />
              ))}
            </div>
          )}
          {menuError && (
            <p className="text-sm text-red-600">
              Não foi possível carregar o cardápio.
            </p>
          )}

          {!loadingMenu && !menuError && filteredPizzas.length === 0 && (
            <p className="text-sm text-slate-500">
              Nenhum item encontrado para os filtros atuais.
            </p>
          )}

          <div className="grid gap-3">
            {filteredPizzas.map((pizza, index) => (
              <ProductCard
                key={pizza.id}
                product={pizza}
                index={index}
                quantityInCart={quantityByPizzaId.get(pizza.id) || 0}
                onOpenCustomization={() => openCustomizationModal(pizza)}
                onShowDetails={() => handleShowDetails(pizza)}
              />
            ))}
          </div>
        </section>

        {/* BARRA DE AÇÕES RÁPIDAS */}
        <QuickActionsBar
          cartCount={cartCount}
          hasActiveOrder={hasActiveOrder}
          onRepeatLastOrder={() => {}}
        />

        {/* Toast mais discreto */}
        {toast &&
          createPortal(
            <div className="fixed bottom-6 right-4 z-50 flex items-center gap-2 rounded-2xl bg-slate-900/90 px-4 py-2 text-[11px] font-semibold text-slate-50 shadow-lg backdrop-blur-sm animate-fade-in">
              <span className="text-xs">✅</span>
              <span>{toast.message}</span>
            </div>,
            document.body
          )}

        {/* Modal de customização da pizza */}

        {modalPizza &&
          createPortal(
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
              style={{ paddingTop: '1vh', paddingBottom: '2vh' }}
              onClick={handleCloseModal}
            >
              <div
                className="relative w-full max-w-md translate-y-1 animate-fade-in rounded-3xl border border-slate-200 bg-white/95 p-4 md:p-6 shadow-2xl transition-all duration-200 ease-out"
                style={{ maxHeight: '98vh', overflowY: 'auto' }}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500 shadow-sm hover:bg-slate-200"
                  onClick={handleCloseModal}
                  type="button"
                >
                  ✕
                </button>

                <div className="mb-3 flex flex-col md:flex-row items-center gap-3 md:gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FF914D]/10 text-lg">
                    🍕
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold tracking-wide text-slate-900">
                      {modalPizza.nome || modalPizza.name}
                    </h2>
                    <p className="text-[12px] text-slate-500">
                      Personalize sabores, borda, extras e quantidade.
                    </p>
                  </div>
                  <div className="ml-auto text-right text-base font-semibold text-[#FF914D]">
                    {formatCurrencyBRL(
                      modalPizza.priceGrande ??
                        modalPizza.preco_grande ??
                        modalPizza.preco ??
                        modalPizza.price ??
                        modalPizza.valor ??
                        0
                    )}
                  </div>
                </div>

                {(modalPizza.description || modalPizza.descricao) && (
                  <p className="mb-3 text-[11px] text-slate-600">
                    {modalPizza.description || modalPizza.descricao}
                  </p>
                )}

                {/* quantidade */}
                <div className="mb-4 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-[11px] font-semibold text-slate-700">
                      Quantidade
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Defina quantas pizzas deseja.
                    </p>
                  </div>
                  <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-1 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setModalQuantity((q) => Math.max(1, q - 1))
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                    >
                      −
                    </button>
                    <span className="mx-2 min-w-[1.5rem] text-center text-[12px] font-semibold text-slate-800">
                      {modalQuantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setModalQuantity((q) => Math.min(10, q + 1))
                      }
                      className="flex h-6 w-6 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* sabores - até 3 */}
                <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-slate-700">
                      Sabores (até 3)
                    </p>
                    <span className="text-[10px] text-slate-500">
                      {modalSelectedFlavors.length}/3 selecionados
                    </span>
                  </div>
                  <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                    {flavorOptions.map((flavor) => {
                      const checked = modalSelectedFlavors.includes(flavor.id);
                      return (
                        <label
                          key={flavor.id}
                          className="flex cursor-pointer items-center justify-between rounded-xl px-2 py-1 text-[11px] hover:bg-white"
                        >
                          <span className="truncate text-slate-700">
                            {flavor.nome}
                          </span>
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#FF914D]"
                            checked={checked}
                            onChange={() => {
                              setModalSelectedFlavors((current) => {
                                const exists = current.includes(flavor.id);
                                if (exists) {
                                  return current.filter((id) => id !== flavor.id);
                                }
                                if (current.length >= 3) return current;
                                return [...current, flavor.id];
                              });
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* borda */}
                <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="mb-1 text-[11px] font-semibold text-slate-700">Borda recheada</p>
                  {loadingBordas ? (
                    <div className="h-8 w-full animate-pulse rounded-full bg-slate-100" />
                  ) : (
                    <select
                      className="w-full rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] text-slate-700"
                      value={modalSelectedCrust}
                      onChange={(e) => setModalSelectedCrust(e.target.value)}
                    >
                      <option value="">Sem borda</option>
                      {bordas.map((borda) => (
                        <option key={borda.id} value={borda.id}>{borda.nome}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* extras */}
                <div className="mb-4 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                  <p className="mb-1 text-[11px] font-semibold text-slate-700">Ingredientes extras</p>
                  {loadingExtras ? (
                    <div className="h-12 w-full animate-pulse rounded-xl bg-slate-100" />
                  ) : (
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      {extras.map((extra) => {
                        const checked = modalSelectedExtras.includes(extra.id);
                        return (
                          <label
                            key={extra.id}
                            className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 hover:bg-white"
                          >
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-slate-300 text-[#FF914D]"
                              checked={checked}
                              onChange={() => {
                                setModalSelectedExtras((current) => {
                                  const exists = current.includes(extra.id);
                                  if (exists) {
                                    return current.filter((e) => e !== extra.id);
                                  }
                                  return [...current, extra.id];
                                });
                              }}
                            />
                            <span className="truncate text-slate-700">{extra.nome}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* resumo e ação */}
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
                  <span>
                    {modalQuantity} pizza
                    {modalQuantity > 1 ? "s" : ""} •{" "}
                    {modalSelectedFlavors.length > 0
                      ? `${modalSelectedFlavors.length} sabor(es)`
                      : "1 sabor padrão"}
                  </span>
                  <span className="font-semibold text-[#FF914D]">
                    {formatCurrencyBRL(
                      (modalPizza.priceGrande ??
                        modalPizza.preco_grande ??
                        modalPizza.preco ??
                        modalPizza.price ??
                        modalPizza.valor ??
                        0) * modalQuantity
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  className="mt-3 w-full rounded-xl bg-[#FF914D] px-4 py-3 text-sm font-semibold text-white shadow hover:bg-[#ff7a21]"
                  onClick={handleConfirmCustomization}
                >
                  Adicionar ao carrinho
                </button>
              </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  );
};

export default CardapioPage;
