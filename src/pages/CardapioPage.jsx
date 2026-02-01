// src/pages/CardapioPage.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useMenuData } from "../hooks/useMenuData";
import { formatCurrencyBRL } from "../utils/menu";
import { loadGoogleMaps } from "../utils/googleMaps";

import iconVeggieUrl from "../assets/icons/veggie.svg";
import iconBestUrl from "../assets/icons/best.svg";
import iconHotUrl from "../assets/icons/hot.svg";
import iconTagUrl from "../assets/icons/tag.svg";
import DeliverySection from "../components/Cardapio/DeliverySection";

const LOCATION_STORAGE_KEY = "at_delivery_location";
const ADDRESS_BOOK_STORAGE_KEY = "at_delivery_address_book";
const DELIVERY_MODE_KEY = "at_delivery_mode";
const SEARCH_STORAGE_KEY = "at_menu_search";
const CHECKOUT_CLIENT_STORAGE_KEY = "checkout_cliente";
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const MOCK_PIZZA_IMAGE_URL =
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Eq_it-na_pizza-margherita_sep2005_sml.jpg";

const normalizeTag = (value) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const toTitleCase = (value) =>
  String(value || "")
    .toLowerCase()
    .split(" ")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");

const TAG_ICON_MAP = {
  veggie: iconVeggieUrl,
  vegetariana: iconVeggieUrl,
  vegana: iconVeggieUrl,
  picante: iconHotUrl,
  apimentada: iconHotUrl,
  "mais pedido": iconBestUrl,
  "mais pedidos": iconBestUrl,
  bestseller: iconBestUrl,
};

const TAG_LABEL_MAP = {
  veggie: "Veggie",
  vegetariana: "Vegetariana",
  vegana: "Vegana",
  picante: "Picante",
  apimentada: "Apimentada",
  "mais pedido": "Mais pedido",
  "mais pedidos": "Mais pedido",
  bestseller: "Mais pedido",
};

const resolveTagMeta = (rawTag) => {
  const normalized = normalizeTag(rawTag);
  if (!normalized) {
    return { label: "", icon: null };
  }
  return {
    label: TAG_LABEL_MAP[normalized] || toTitleCase(normalized),
    icon: TAG_ICON_MAP[normalized] || iconTagUrl,
  };
};

const normalizeAddressLabel = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*/g, ", ")
    .trim();

const buildAddressEntry = ({ label, coords, nickname }) => {
  const cleaned = normalizeAddressLabel(label);
  const parts = cleaned
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const title = nickname || parts[0] || cleaned;
  const subtitle = parts.slice(1).join(", ");
  const now = Date.now();

  return {
    id: `${now}-${Math.round(Math.random() * 1e6)}`,
    label: cleaned,
    title,
    subtitle,
    nickname: nickname || "",
    coords: coords || null,
    createdAt: now,
    lastUsedAt: now,
  };
};

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
  const renderBadge = (rawTag, index) => {
    const { label, icon } = resolveTagMeta(rawTag);
    if (!label) return null;
    return (
      <span
        key={`${label}-${index}`}
        className="rounded-full border border-[#FF914D]/40 bg-[#FF914D]/10 px-2.5 py-1 text-[11px] font-semibold text-[#FF914D] flex items-center gap-1.5"
      >
        {icon && (
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/70">
            <img src={icon} alt={label} className="h-3.5 w-3.5" />
          </span>
        )}
        <span>{label}</span>
      </span>
    );
  };

  return (
    <article
      className="flex gap-4 cursor-pointer rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 hover:border-orange-200/80 hover:shadow-lg"
      onClick={onShowDetails}
    >
      <div className="hidden sm:block sm:w-24 sm:h-24 flex-shrink-0">
        <img
          src={product.imagem || MOCK_PIZZA_IMAGE_URL}
          alt={product.nome || product.name}
          className="w-full h-full object-cover rounded-2xl bg-slate-100"
        />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              {String(index + 1).padStart(2, "0")} • Pizza
            </p>
            <h3 className="mt-1 text-sm font-bold text-slate-900">
              {product.nome || product.name}
            </h3>
            {hasDescription && (
              <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">
                {product.descricao || product.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-bold text-white shadow-md">
              {formatCurrencyBRL(mainPrice)}
            </span>

            {badges.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5 justify-end">
                {badges.map((item, index) => renderBadge(item, index))}
              </div>
            )}

            {badge && badges.length === 0 && (
              <div className="mt-1.5 flex justify-end">
                {renderBadge(badge, "single") || (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                    {badge}
                  </span>
                )}
              </div>
            )}

            {quantityInCart > 0 && (
              <span className="text-xs font-bold text-emerald-700 mt-1">
                {quantityInCart} no carrinho
              </span>
            )}
          </div>
        </header>

        {ingredientes && ingredientes.length > 0 && (
          <p className="my-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-600">Ingredientes: </span>
            <span>
              {Array.isArray(ingredientes)
                ? ingredientes.join(", ")
                : ingredientes}
            </span>
          </p>
        )}

        <footer className="mt-auto pt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {product.quantidade_sabores && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1">
                <span className="text-sm">🍕</span>
                {product.quantidade_sabores} sabores
              </span>
            )}
            {product.tamanho && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1">
                <span className="text-sm">📏</span>
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
            className="inline-flex items-center gap-2 rounded-full bg-[#FF914D] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-md transition-all hover:bg-[#ff7a21] active:scale-[0.98]"
          >
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-base font-light">
              +
            </span>
            Personalizar
          </button>
        </footer>
      </div>
    </article>
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
  const [showAllSavedAddresses, setShowAllSavedAddresses] = useState(false);
  const [addressNickname, setAddressNickname] = useState("");
  const [saveFeedback, setSaveFeedback] = useState("");
  const [isEditingCurrentAddress, setIsEditingCurrentAddress] = useState(false);
  const [editAddressValue, setEditAddressValue] = useState("");
  const [liveAddressLine, setLiveAddressLine] = useState("");
  const [mapEmbedUrl, setMapEmbedUrl] = useState("");

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const mapDragTimerRef = useRef(null);

  // estados de customização da pizza (modal)
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalSelectedFlavors, setModalSelectedFlavors] = useState([]);
  const [modalSelectedCrust, setModalSelectedCrust] = useState("");
  const [modalSelectedExtras, setModalSelectedExtras] = useState([]);
  const [modalFlavorSearch, setModalFlavorSearch] = useState("");

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
  const visibleSavedAddresses = useMemo(
    () =>
      showAllSavedAddresses
        ? savedAddresses
        : savedAddresses.slice(0, 2),
    [savedAddresses, showAllSavedAddresses]
  );

  // lista de sabores para multi-select (todas as pizzas)
  const flavorOptions = useMemo(
    () =>
      pizzas.map((pz) => ({
        id: pz.id,
        nome: pz.nome || pz.name,
      })),
    [pizzas]
  );

  const filteredFlavorOptions = useMemo(() => {
    if (!modalFlavorSearch) {
      return flavorOptions;
    }
    const term = modalFlavorSearch.toLowerCase();
    return flavorOptions.filter((flavor) =>
      flavor.nome.toLowerCase().includes(term)
    );
  }, [flavorOptions, modalFlavorSearch]);

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

  const addAddressToBook = (label, coords, nickname = "") => {
    const cleanedLabel = normalizeAddressLabel(label);
    if (!cleanedLabel) return;

    setSavedAddresses((prev) => {
      const normalized = cleanedLabel.toLowerCase();
      const existingIndex = prev.findIndex(
        (entry) => normalizeAddressLabel(entry.label).toLowerCase() === normalized
      );

      let next = [...prev];
      const now = Date.now();

      if (existingIndex >= 0) {
        const existing = next[existingIndex];
        const nextNickname = nickname || existing.nickname || "";
        const fallback = buildAddressEntry({
          label: cleanedLabel,
          coords: existing.coords,
          nickname: nextNickname,
        });

        next[existingIndex] = {
          ...existing,
          label: cleanedLabel,
          title: nextNickname || existing.title || fallback.title,
          subtitle: existing.subtitle || fallback.subtitle,
          nickname: nextNickname,
          coords: coords || existing.coords || null,
          lastUsedAt: now,
        };
      } else {
        next = [
          buildAddressEntry({
            label: cleanedLabel,
            coords: coords || null,
            nickname,
          }),
          ...next,
        ];
      }

      next = next
        .map((entry) => ({
          ...entry,
          title:
            entry.title ||
            buildAddressEntry({ label: entry.label }).title,
          subtitle:
            entry.subtitle ||
            buildAddressEntry({ label: entry.label }).subtitle,
        }))
        .sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0))
        .slice(0, 6);

      try {
        localStorage.setItem(ADDRESS_BOOK_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }

      return next;
    });
  };

  const normalizedCurrentAddress = useMemo(
    () => normalizeAddressLabel(deliveryAddress || manualAddress),
    [deliveryAddress, manualAddress]
  );

  const savedCurrentAddress = useMemo(() => {
    if (!normalizedCurrentAddress) return null;
    return (
      savedAddresses.find(
        (entry) =>
          normalizeAddressLabel(entry.label).toLowerCase() ===
          normalizedCurrentAddress.toLowerCase()
      ) || null
    );
  }, [savedAddresses, normalizedCurrentAddress]);

  const saveCurrentAddress = () => {
    if (!normalizedCurrentAddress) return;
    const nickname = addressNickname.trim();
    addAddressToBook(normalizedCurrentAddress, currentCoords, nickname);
    setSaveFeedback(
      savedCurrentAddress
        ? "Endereco atualizado nos salvos."
        : "Endereco salvo com sucesso."
    );
    setAddressNickname("");
  };

  const removeSavedAddress = (id) => {
    if (!id) return;
    setSavedAddresses((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      try {
        localStorage.setItem(ADDRESS_BOOK_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const startEditCurrentAddress = () => {
    if (!normalizedCurrentAddress) return;
    setEditAddressValue(normalizedCurrentAddress);
    setIsEditingCurrentAddress(true);
  };

  const cancelEditCurrentAddress = () => {
    setIsEditingCurrentAddress(false);
    setEditAddressValue("");
  };

  const applyEditCurrentAddress = () => {
    const updated = normalizeAddressLabel(editAddressValue);
    if (!updated) return;
    setLiveAddressLine(updated);
    setManualAddress(updated);
    setDeliveryAddress(updated);
    persistCheckoutAddress(updated);
    setDeliveryReference("Endereco ajustado");
    setDeliveryStatus("ok");
    setDeliveryMessage("Endereco atualizado para calculo da entrega.");
    addAddressToBook(updated, currentCoords, addressNickname.trim());
    setIsEditingCurrentAddress(false);
    setEditAddressValue("");
  };

  useEffect(() => {
    if (!saveFeedback) return;
    const timer = setTimeout(() => setSaveFeedback(""), 2500);
    return () => clearTimeout(timer);
  }, [saveFeedback]);

  useEffect(() => {
    setIsEditingCurrentAddress(false);
    setEditAddressValue("");
  }, [normalizedCurrentAddress]);

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

  const buildStreetLineFromGoogle = (result) => {
    if (!result) return "";
    const components = result.address_components || [];
    const route = components.find((item) => item.types?.includes("route"))
      ?.long_name;
    const number = components.find((item) =>
      item.types?.includes("street_number")
    )?.long_name;
    const neighborhood = components.find((item) =>
      item.types?.includes("sublocality")
    )?.long_name;
    const streetLine = [route, number].filter(Boolean).join(", ");
    if (streetLine && neighborhood) {
      return `${streetLine} - ${neighborhood}`;
    }
    return streetLine || result.formatted_address || "";
  };

  const reverseGeocodeGoogle = async (coords, google) => {
    if (!coords || !google?.maps) return null;
    const geocoder = geocoderRef.current || new google.maps.Geocoder();
    geocoderRef.current = geocoder;
    return new Promise((resolve) => {
      geocoder.geocode({ location: coords }, (results, status) => {
        if (status === "OK" && results && results[0]) {
          resolve(results[0]);
          return;
        }
        resolve(null);
      });
    });
  };

  const persistCheckoutAddress = (address) => {
    if (!address) return;
    try {
      const raw = localStorage.getItem(CHECKOUT_CLIENT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      const next = {
        ...(parsed && typeof parsed === "object" ? parsed : {}),
        endereco: address,
      };
      localStorage.setItem(CHECKOUT_CLIENT_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const updateAddressFromCoords = async (coords, google, shouldSave) => {
    const result = await reverseGeocodeGoogle(coords, google);
    if (!result) return;
    const streetLine = buildStreetLineFromGoogle(result);
    const formatted = result.formatted_address || streetLine;
    if (streetLine) {
      setLiveAddressLine(streetLine);
    }
    if (formatted) {
      setManualAddress(formatted);
      setDeliveryAddress(formatted);
      persistCheckoutAddress(formatted);
    }
    setDeliveryReference(shouldSave ? "Endereco ajustado" : "Pino ajustado");
    setDeliveryStatus("ok");
    setDeliveryMessage("Endereco atualizado pelo mapa.");
    if (shouldSave && formatted) {
      addAddressToBook(formatted, coords, "");
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
    setModalFlavorSearch("");

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
      setLiveAddressLine(value);
      persistCheckoutAddress(value);
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
        setLiveAddressLine(resolvedAddress);
        persistCheckoutAddress(resolvedAddress);
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
    if (!GOOGLE_MAPS_API_KEY || !mapContainerRef.current || !currentCoords) {
      return;
    }

    let cancelled = false;

    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then((google) => {
        if (cancelled) return;
        const center = {
          lat: Number(currentCoords.lat),
          lng: Number(currentCoords.lng),
        };

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
            center,
            zoom: 17,
            disableDefaultUI: true,
            zoomControl: true,
            mapTypeControl: false,
            fullscreenControl: false,
            streetViewControl: false,
          });
        } else {
          mapInstanceRef.current.setCenter(center);
        }

        if (!markerRef.current) {
          markerRef.current = new google.maps.Marker({
            position: center,
            map: mapInstanceRef.current,
            draggable: true,
          });

          markerRef.current.addListener("drag", () => {
            const pos = markerRef.current?.getPosition?.();
            if (!pos) return;
            const coords = { lat: pos.lat(), lng: pos.lng() };
            if (mapDragTimerRef.current) {
              window.clearTimeout(mapDragTimerRef.current);
            }
            mapDragTimerRef.current = window.setTimeout(() => {
              updateAddressFromCoords(coords, google, false);
            }, 500);
          });

          markerRef.current.addListener("dragend", () => {
            const pos = markerRef.current?.getPosition?.();
            if (!pos) return;
            const coords = { lat: pos.lat(), lng: pos.lng() };
            setCurrentCoords(coords);
            if (mapDragTimerRef.current) {
              window.clearTimeout(mapDragTimerRef.current);
            }
            mapDragTimerRef.current = window.setTimeout(() => {
              updateAddressFromCoords(coords, google, true);
            }, 0);
          });
        } else {
          markerRef.current.setPosition(center);
        }

        if (!liveAddressLine) {
          updateAddressFromCoords(center, google, false);
        }
      })
      .catch(() => {
        // ignore map load failure
      });

    return () => {
      cancelled = true;
    };
  }, [
    GOOGLE_MAPS_API_KEY,
    currentCoords?.lat,
    currentCoords?.lng,
    liveAddressLine,
  ]);

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
        <DeliverySection
          horarioAbertura={horarioAbertura}
          deliveryStatus={deliveryStatus}
          deliveryMode={deliveryMode}
          setDeliveryMode={setDeliveryMode}
          isRequestingLocation={isRequestingLocation}
          manualAddress={manualAddress}
          setManualAddress={setManualAddress}
          handleUseLocation={handleUseLocation}
          handleManualAddressCheck={handleManualAddressCheck}
          deliveryDistanceText={deliveryDistanceText}
          deliveryDurationText={deliveryDurationText}
          deliveryReference={deliveryReference}
          normalizedCurrentAddress={normalizedCurrentAddress}
          startEditCurrentAddress={startEditCurrentAddress}
          saveCurrentAddress={saveCurrentAddress}
          savedCurrentAddress={savedCurrentAddress}
          addressNickname={addressNickname}
          setAddressNickname={setAddressNickname}
          isEditingCurrentAddress={isEditingCurrentAddress}
          editAddressValue={editAddressValue}
          setEditAddressValue={setEditAddressValue}
          applyEditCurrentAddress={applyEditCurrentAddress}
          cancelEditCurrentAddress={cancelEditCurrentAddress}
          saveFeedback={saveFeedback}
          savedAddresses={savedAddresses}
          visibleSavedAddresses={visibleSavedAddresses}
          removeSavedAddress={removeSavedAddress}
          showAllSavedAddresses={showAllSavedAddresses}
          setShowAllSavedAddresses={setShowAllSavedAddresses}
          updateMapFromCoords={updateMapFromCoords}
          setDeliveryDistanceText={setDeliveryDistanceText}
          setDeliveryDurationText={setDeliveryDurationText}
          setDeliveryReference={setDeliveryReference}
          setDeliveryStatus={setDeliveryStatus}
          setDeliveryMessage={setDeliveryMessage}
          addAddressToBook={addAddressToBook}
          setDeliveryAddress={setDeliveryAddress}
          setLiveAddressLine={setLiveAddressLine}
          persistCheckoutAddress={persistCheckoutAddress}
          mapEmbedUrl={mapEmbedUrl}
          currentCoords={currentCoords}
          GOOGLE_MAPS_API_KEY={GOOGLE_MAPS_API_KEY}
          mapContainerRef={mapContainerRef}
          deliveryAddress={deliveryAddress}
          liveAddressLine={liveAddressLine}
          deliveryMessage={deliveryMessage}
        />

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

        {/* BARRA DE AÇÕES RÁPIDAS (REMOVIDA) */}
        {/* A navegação principal agora centraliza o acesso ao carrinho e outras seções. */}

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
