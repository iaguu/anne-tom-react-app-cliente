import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { serverInstance } from "../api/server";
import { useMenuData } from "../hooks/useMenuData";
import { getFeeByDistance, parseDistanceKm } from "../utils/deliveryFees";
import { getDistanceMatrix } from "../utils/googleMaps";
import { formatCurrencyBRL } from "../utils/menu";

const FILTER_PRESETS = [
  { key: "all", label: "Todos" },
  { key: "best", label: "Mais pedidos" },
  { key: "new", label: "Novidades" },
  { key: "veggie", label: "Veggie" },
  { key: "hot", label: "Picantes" },
  { key: "esfiha", label: "Big Esfihas" },
  { key: "promo", label: "Combos & Promoções" },
  { key: "doces", label: "Pizzas doces" },
];

const OPENING_LABEL = "Terça a domingo das 19h às 23h (segunda fechado)";
const OPENING_HOUR = 19;
const CLOSING_HOUR = 23;

const DELIVERY_RADIUS_KM = 15;
const LOCATION_STORAGE_KEY = "delivery_location";
const DISTANCE_STORAGE_KEY = "delivery_distance_km";

const {
  VITE_GOOGLE_MAPS_API_KEY: DISTANCE_MATRIX_API_KEY = "",
  VITE_DELIVERY_ORIGIN: DELIVERY_ORIGIN =
    "Pizzaria Anne & Tom, Alto de Santana, Sao Paulo",
} = import.meta.env;

const WHATSAPP_SCHEDULE_LINK =
  "https://wa.me/5511932507007?text=Oi%2C%20gostaria%20de%20agendar%20um%20pedido.";

const BADGE_LABELS = {
  best: "Mais pedido",
  new: "Novo",
  veggie: "Veggie",
  hot: "Picante",
  promo: "Promoção",
};

const BADGE_EMOJIS = {
  best: "🔥",
  new: "✨",
  veggie: "🥬",
  hot: "🌶️",
  promo: "💥",
};

const ALLERGEN_EMOJIS = {
  Lactose: "🥛",
  Gluten: "🌾",
};

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const containsAny = (text, keywords) =>
  keywords.some((keyword) => text.includes(keyword));

const formatCountdown = (ms) => {
  if (!Number.isFinite(ms) || ms <= 0) return "instantes";
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

const getScheduleStatus = (date) => {
  const now = new Date(date);
  const day = now.getDay();
  const isOpenDay = day !== 1;
  const openTime = new Date(now);
  openTime.setHours(OPENING_HOUR, 0, 0, 0);
  const closeTime = new Date(now);
  closeTime.setHours(CLOSING_HOUR, 0, 0, 0);

  const isOpen = isOpenDay && now >= openTime && now < closeTime;
  if (isOpen) {
    return {
      isOpen: true,
      nextChangeAt: closeTime,
      label: `Fecha em ${formatCountdown(closeTime - now)}`,
    };
  }

  let nextOpen = new Date(now);
  if (isOpenDay && now < openTime) {
    nextOpen = openTime;
  } else {
    nextOpen.setDate(now.getDate() + 1);
    nextOpen.setHours(OPENING_HOUR, 0, 0, 0);
    while (nextOpen.getDay() === 1) {
      nextOpen.setDate(nextOpen.getDate() + 1);
    }
  }

  return {
    isOpen: false,
    nextChangeAt: nextOpen,
    label: `Abre em ${formatCountdown(nextOpen - now)}`,
  };
};

const getAllergenTags = (pizza) => {
  if (!pizza) return [];
  const ingredientsText = normalizeText(
    (pizza.ingredientes || []).join(" ")
  );
  const categoryText = normalizeText(pizza.categoria || "");
  const lactoseFree =
    ingredientsText.includes("sem lactose") ||
    ingredientsText.includes("lactose free");
  const glutenFree = ingredientsText.includes("sem gluten");

  const lactoseKeywords = [
    "mussarela",
    "mucarela",
    "queijo",
    "catupiry",
    "provolone",
    "parmesao",
    "cheddar",
    "gorgonzola",
    "requeijao",
    "cream cheese",
    "burrata",
  ];

  const glutenKeywords = ["trigo", "farinha", "massa"];

  const tags = [];
  if (!lactoseFree && containsAny(ingredientsText, lactoseKeywords)) {
    tags.push("Lactose");
  }
  if (
    !glutenFree &&
    (containsAny(ingredientsText, glutenKeywords) ||
      categoryText.includes("pizza"))
  ) {
    tags.push("Gluten");
  }
  return tags;
};

const matchesPreset = (presetKey, pizza) => {
  if (!pizza) return false;
  const normalizedCategory = (pizza.categoria || "").toLowerCase();
  const badges = Array.isArray(pizza.badges) ? pizza.badges : [];
  const hasBadge = (badge) => badges.includes(badge);
  switch (presetKey) {
    case "best":
      return hasBadge("best");
    case "new":
      return hasBadge("new");
    case "veggie":
      return hasBadge("veggie");
    case "hot":
      return hasBadge("hot");
    case "esfiha":
      return normalizedCategory.includes("esfiha");
    case "promo":
      return hasBadge("promo") || hasBadge("best");
    case "doces":
      return normalizedCategory.includes("doce");
    default:
      return true;
  }
};

const getExtraIdentifier = (extra, index) =>
  String(
    extra?.id ??
      extra?.codigo ??
      extra?.code ??
      extra?.slug ??
      extra?.nome ??
      extra?.name ??
      `extra-${index}`
  );

const CardapioPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { pizzas = [], loadingMenu, menuError, isUsingCachedMenu } = useMenuData();
  const { items, addItem, replaceItem } = useCart();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const [preset, setPreset] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [deliveryMode, setDeliveryMode] = useState("delivery");
  const [now, setNow] = useState(() => new Date());
  const [selectedPizzaId, setSelectedPizzaId] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState("grande");
  const [selectedExtras, setSelectedExtras] = useState([]);
  const [selectedFlavorIds, setSelectedFlavorIds] = useState([]);
  const [flavorSearch, setFlavorSearch] = useState("");
  const [observations, setObservations] = useState("");
  const [editingItemKey, setEditingItemKey] = useState(null);
  const [editingOrigin, setEditingOrigin] = useState("");
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState(null);
  const [deliveryDistanceText, setDeliveryDistanceText] = useState("");
  const [deliveryDurationText, setDeliveryDurationText] = useState("");
  const [withinDeliveryRadius, setWithinDeliveryRadius] = useState(null);
  const [deliveryError, setDeliveryError] = useState("");
  const [checkingDelivery, setCheckingDelivery] = useState(false);
  const [quickQuantities, setQuickQuantities] = useState({});
  const [recentItems, setRecentItems] = useState([]);
  const [toast, setToast] = useState(null);
  const [popularPizzas, setPopularPizzas] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [popularError, setPopularError] = useState("");
  const toastTimerRef = useRef(null);
  const modalBodyRef = useRef(null);

  const scheduleStatus = useMemo(() => getScheduleStatus(now), [now]);
  const isOpenNow = scheduleStatus.isOpen;
  const scheduleCountdown = scheduleStatus.label;
  const maxAdditionalFlavors = selectedSize === "broto" ? 1 : 2;
  const maxTotalFlavors = maxAdditionalFlavors + 1;
  const canOrder =
    isOpenNow && (deliveryMode === "pickup" || withinDeliveryRadius === true);
  const deliveryFee = useMemo(() => {
    if (deliveryMode === "pickup") return 0;
    if (deliveryDistanceKm == null) return null;
    return getFeeByDistance(deliveryDistanceKm);
  }, [deliveryMode, deliveryDistanceKm]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("checkout_cliente");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.retirada) {
        setDeliveryMode("pickup");
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("checkout_cliente");
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.retirada = deliveryMode === "pickup";
      localStorage.setItem("checkout_cliente", JSON.stringify(parsed));
    } catch {
      // ignore
    }
  }, [deliveryMode]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lastOrderSummary");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.items)) {
        setRecentItems(parsed.items.slice(0, 6));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!pizzas.length) return;
    let cancelled = false;

    const loadPopularPizzas = async () => {
      setLoadingPopular(true);
      setPopularError("");
      try {
        const response = await serverInstance.baseDomain.instance.get(
          "/api/orders",
          {
            params: { limit: 200 },
          }
        );
        const rawData = response?.data || {};
        const orders = Array.isArray(rawData)
          ? rawData
          : rawData.orders || rawData.items || [];

        const countsById = new Map();
        const countsByName = new Map();

        const addCountByName = (name, qty) => {
          const normalized = normalizeText(name);
          if (!normalized) return;
          countsByName.set(normalized, (countsByName.get(normalized) || 0) + qty);
        };

        orders.forEach((order) => {
          const items =
            order.items || order.itens || order.orderItems || order.products || [];
          items.forEach((item) => {
            const qty = Number(item.quantity ?? item.quantidade ?? 1) || 1;
            const productId =
              item.productId ?? item.idPizza ?? item.product_id ?? item.id;
            if (productId != null) {
              const idKey = String(productId);
              countsById.set(idKey, (countsById.get(idKey) || 0) + qty);
            }
            const rawName =
              item.name || item.nome || item.title || item.description || "";
            if (rawName) {
              if (rawName.includes("/")) {
                rawName
                  .split("/")
                  .map((name) => name.trim())
                  .filter(Boolean)
                  .forEach((name) => addCountByName(name, qty));
              } else {
                addCountByName(rawName, qty);
              }
            }
          });
        });

        const ranked = pizzas
          .map((pizza) => {
            const idKey = String(pizza.id);
            const nameKey = normalizeText(pizza.nome);
            const count =
              countsById.get(idKey) || countsByName.get(nameKey) || 0;
            return { pizza, count };
          })
          .filter((entry) => entry.count > 0)
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
          .map((entry) => entry.pizza);

        if (!cancelled) {
          setPopularPizzas(ranked);
        }
      } catch (err) {
        console.error("[Cardapio] popular pizzas error:", err);
        if (!cancelled) {
          setPopularError("Nao foi possivel carregar os mais pedidos.");
        }
      } finally {
        if (!cancelled) setLoadingPopular(false);
      }
    };

    loadPopularPizzas();

    return () => {
      cancelled = true;
    };
  }, [pizzas]);

  useEffect(() => {
    if (!toast) return;
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
    }, 3500);
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [toast]);

  const checkDeliveryDistance = async (coords) => {
    if (!DISTANCE_MATRIX_API_KEY) {
      setDeliveryError("Chave do Google Maps nao configurada.");
      setWithinDeliveryRadius(false);
      setCheckingDelivery(false);
      return;
    }

    try {
      setCheckingDelivery(true);
      setDeliveryError("");

      const destination = { lat: coords.lat, lng: coords.lng };
      const data = await getDistanceMatrix({
        apiKey: DISTANCE_MATRIX_API_KEY,
        origin: DELIVERY_ORIGIN,
        destination,
      });
      const km = parseDistanceKm(data.distanceText);
      setDeliveryDistanceKm(km);
      setDeliveryDistanceText(data.distanceText || "");
      setDeliveryDurationText(data.durationText || "");
      setWithinDeliveryRadius(km != null && km <= DELIVERY_RADIUS_KM);
      try {
        if (km != null) {
          localStorage.setItem(DISTANCE_STORAGE_KEY, String(km));
        } else {
          localStorage.removeItem(DISTANCE_STORAGE_KEY);
        }
      } catch {
        // ignore
      }
    } catch (err) {
      console.error("[Cardapio] delivery distance error:", err);
      setDeliveryError("Nao foi possivel validar o raio de entrega.");
      setWithinDeliveryRadius(false);
      setDeliveryDistanceText("");
      setDeliveryDurationText("");
    } finally {
      setCheckingDelivery(false);
    }
  };

  const requestLocation = () => {
    if (!navigator?.geolocation) {
      setDeliveryError("Seu navegador nao suporta geolocalizacao.");
      setWithinDeliveryRadius(false);
      return;
    }

    setCheckingDelivery(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        try {
          localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(coords));
        } catch {
          // ignore
        }
        checkDeliveryDistance(coords);
      },
      (error) => {
        console.error("[Cardapio] geolocation error:", error);
        setDeliveryError("Nao foi possivel obter sua localizacao.");
        setWithinDeliveryRadius(false);
        setCheckingDelivery(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    let cachedCoords = null;
    try {
      const raw = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (raw) cachedCoords = JSON.parse(raw);
    } catch {
      cachedCoords = null;
    }

    if (cachedCoords?.lat && cachedCoords?.lng) {
      try {
        const cachedDistanceRaw = localStorage.getItem(DISTANCE_STORAGE_KEY);
        const cachedDistance = cachedDistanceRaw
          ? Number(cachedDistanceRaw)
          : null;
        if (Number.isFinite(cachedDistance)) {
          setDeliveryDistanceKm(cachedDistance);
          setWithinDeliveryRadius(cachedDistance <= DELIVERY_RADIUS_KM);
        }
      } catch {
        // ignore
      }
      checkDeliveryDistance(cachedCoords);
    } else {
      requestLocation();
    }
  }, []);

  useEffect(() => {
    if (!location.state?.editItemKey) return;
    setEditingItemKey(location.state.editItemKey);
    setEditingOrigin(location.state.editOrigin || "");
  }, [location.state]);

  const editingItem = useMemo(() => {
    if (!editingItemKey) return null;
    return (
      items.find(
        (item) =>
          item.id === editingItemKey.id &&
          item.tamanho === editingItemKey.tamanho
      ) || null
    );
  }, [items, editingItemKey]);

  useEffect(() => {
    if (!editingItem || pizzas.length === 0) return;

    const flavorIds = Array.isArray(editingItem.saboresIds)
      ? editingItem.saboresIds.map((id) => String(id))
      : [];
    let primaryId = flavorIds[0] || editingItem.idPizza || null;

    if (!primaryId && editingItem.nome) {
      const match = pizzas.find(
        (pizza) =>
          pizza.nome?.toLowerCase() === editingItem.nome.toLowerCase()
      );
      primaryId = match?.id || null;
    }

    if (!primaryId) return;

    const extraFlavorIds = [];
    if (flavorIds.length > 1) {
      extraFlavorIds.push(...flavorIds.slice(1));
    } else if (Array.isArray(editingItem.sabores)) {
      const extraNames = editingItem.sabores.slice(1);
      extraNames.forEach((name) => {
        const match = pizzas.find(
          (pizza) => pizza.nome?.toLowerCase() === String(name).toLowerCase()
        );
        if (match && String(match.id) !== String(primaryId)) {
          extraFlavorIds.push(String(match.id));
        }
      });
    } else if (editingItem.meio) {
      String(editingItem.meio)
        .split("/")
        .map((name) => name.trim())
        .filter(Boolean)
        .forEach((name) => {
          const match = pizzas.find(
            (pizza) => pizza.nome?.toLowerCase() === name.toLowerCase()
          );
          if (match && String(match.id) !== String(primaryId)) {
            extraFlavorIds.push(String(match.id));
          }
        });
    }

    setSelectedPizzaId(String(primaryId));
    setSelectedSize(editingItem.tamanho || "grande");
    setQuantity(editingItem.quantidade || 1);
    setObservations(editingItem.obsPizza || "");
    setSelectedFlavorIds(extraFlavorIds.slice(0, maxAdditionalFlavors));
    setSelectedExtras([]);

    const pizza = pizzas.find((p) => String(p.id) === String(primaryId));
    const extrasFromItem = Array.isArray(editingItem.extras)
      ? editingItem.extras
      : [];
    if (pizza?.extras?.length && extrasFromItem.length) {
      const matchedExtras = pizza.extras.reduce((acc, extra, index) => {
        const name = extra.nome || extra.name || extra.label;
        if (name && extrasFromItem.includes(name)) {
          acc.push(getExtraIdentifier(extra, index));
        }
        return acc;
      }, []);
      setSelectedExtras(matchedExtras);
    }
  }, [editingItem, pizzas]);

  const resetModalState = () => {
    setQuantity(1);
    setSelectedExtras([]);
    setSelectedFlavorIds([]);
    setFlavorSearch("");
    setObservations("");
  };

  const openPizzaModal = (pizza) => {
    setSelectedPizzaId(String(pizza.id));
    const preferGrande = pizza.preco_grande != null;
    setSelectedSize(preferGrande ? "grande" : "broto");
    resetModalState();
    setEditingItemKey(null);
    setEditingOrigin("");
  };

  const closeModal = () => {
    setSelectedPizzaId(null);
    resetModalState();
    setEditingItemKey(null);
    setEditingOrigin("");
  };

  useEffect(() => {
    if (!selectedPizzaId) return;
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
  }, [selectedPizzaId]);

  useEffect(() => {
    if (selectedFlavorIds.length <= maxAdditionalFlavors) return;
    setSelectedFlavorIds((prev) => prev.slice(0, maxAdditionalFlavors));
  }, [maxAdditionalFlavors, selectedFlavorIds.length]);

  useEffect(() => {
    if (!selectedPizzaId) return;
    const { style } = document.body;
    const prevOverflow = style.overflow;
    const prevPaddingRight = style.paddingRight;
    const scrollBarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    style.overflow = "hidden";
    if (scrollBarWidth > 0) {
      style.paddingRight = `${scrollBarWidth}px`;
    }

    return () => {
      style.overflow = prevOverflow;
      style.paddingRight = prevPaddingRight;
    };
  }, [selectedPizzaId]);

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
      if (!matchesPreset(preset, pizza)) return false;
      const normalizedCategory = (pizza.categoria || "").toLowerCase();
      if (typeFilter === "pizza" && !normalizedCategory.includes("pizza")) {
        return false;
      }
      if (typeFilter === "doces" && !normalizedCategory.includes("doce")) {
        return false;
      }
      if (selectedCategory !== "todas") {
        if (normalizedCategory !== selectedCategory.toLowerCase()) {
          return false;
        }
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
  }, [pizzas, preset, selectedCategory, search, typeFilter]);

  const selectedPizza = useMemo(
    () => pizzas.find((pizza) => String(pizza.id) === selectedPizzaId) || null,
    [pizzas, selectedPizzaId]
  );

  const selectedFlavorPizzas = useMemo(() => {
    if (!selectedFlavorIds.length) return [];
    return selectedFlavorIds
      .map((id) =>
        pizzas.find((pizza) => String(pizza.id) === String(id))
      )
      .filter(Boolean);
  }, [pizzas, selectedFlavorIds]);

  const extrasList = selectedPizza?.extras || [];

  const extrasTotal = useMemo(() => {
    return extrasList.reduce((sum, extra, index) => {
      const id = getExtraIdentifier(extra, index);
      if (!selectedExtras.includes(id)) return sum;
      const price =
        safeNumber(extra.preco ?? extra.valor ?? extra.price ?? extra.value ?? 0);
      return sum + price;
    }, 0);
  }, [extrasList, selectedExtras]);

  const selectedFlavorPrices = useMemo(() => {
    if (!selectedPizza) return [];
    const priceKey = selectedSize === "broto" ? "preco_broto" : "preco_grande";
    return [selectedPizza, ...selectedFlavorPizzas].map((pizza) =>
      safeNumber(pizza?.[priceKey])
    );
  }, [selectedPizza, selectedFlavorPizzas, selectedSize]);

  const unitPrice = useMemo(() => {
    if (!selectedPizza) return 0;
    const maxFlavorPrice =
      selectedFlavorPrices.length > 0 ? Math.max(...selectedFlavorPrices) : 0;
    return maxFlavorPrice + extrasTotal;
  }, [selectedPizza, selectedFlavorPrices, extrasTotal]);
  const totalPrice = unitPrice * quantity;

  const toggleExtra = (id) => {
    setSelectedExtras((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const showToast = (message) => {
    setToast({ message });
  };

  const getQuickQuantity = (pizzaId) =>
    Math.max(1, Number(quickQuantities[pizzaId]) || 1);

  const updateQuickQuantity = (pizzaId, delta) => {
    setQuickQuantities((prev) => {
      const current = Math.max(1, Number(prev[pizzaId]) || 1);
      const next = Math.max(1, current + delta);
      return { ...prev, [pizzaId]: next };
    });
  };

  const toggleFlavor = (id) => {
    setSelectedFlavorIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= maxAdditionalFlavors) return prev;
      return [...prev, id];
    });
  };

  const handleAddToCart = () => {
    if (!selectedPizza || unitPrice <= 0 || !canOrder) return;
    const extrasForItem = extrasList
      .map((extra, index) => {
        const id = getExtraIdentifier(extra, index);
        if (!selectedExtras.includes(id)) return null;
        return extra.nome || extra.name || extra.label || `Adicional ${index + 1}`;
      })
      .filter(Boolean);
    const flavorNames = [
      selectedPizza.nome,
      ...selectedFlavorPizzas.map((pizza) => pizza.nome),
    ].filter(Boolean);
    const flavorIds = [String(selectedPizza.id), ...selectedFlavorIds];
    const cartItem = {
      id: `pizza-${flavorIds.join("-")}`,
      idPizza: selectedPizza.id,
      saboresIds: flavorIds,
      sabores: flavorNames,
      nome: flavorNames.join(" / "),
      tamanho: selectedSize,
      quantidade: quantity,
      precoUnitario: unitPrice,
      extras: extrasForItem,
      obsPizza: observations.trim() || null,
    };
    const wasEditing = !!editingItemKey;
    const origin = editingOrigin;
    if (editingItemKey) {
      replaceItem(editingItemKey.id, editingItemKey.tamanho, cartItem);
    } else {
      addItem(cartItem);
    }
    showToast(
      `${editingItemKey ? "Atualizado" : "Adicionado"}: ${cartItem.nome} (${quantity}x)`
    );
    closeModal();
    if (wasEditing && origin === "checkout") {
      navigate("/checkout");
    }
  };

  const handleQuickAdd = (pizza, event) => {
    event?.stopPropagation();
    if (!pizza || !canOrder) return;
    const preferGrande = pizza.preco_grande != null;
    const size = preferGrande ? "grande" : "broto";
    const priceKey = size === "broto" ? "preco_broto" : "preco_grande";
    const price = safeNumber(pizza[priceKey]);
    if (price <= 0) return;
    const qty = getQuickQuantity(pizza.id);
    const cartItem = {
      id: `pizza-${pizza.id}`,
      idPizza: pizza.id,
      saboresIds: [String(pizza.id)],
      sabores: [pizza.nome],
      nome: pizza.nome,
      tamanho: size,
      quantidade: qty,
      precoUnitario: price,
      extras: [],
      obsPizza: null,
    };
    addItem(cartItem);
    showToast(`Adicionado: ${pizza.nome} (${qty}x)`);
  };

  const handleReorderItem = (item) => {
    if (!item || !canOrder) return;
    const fallbackId =
      Array.isArray(item.saboresIds) && item.saboresIds.length
        ? `pizza-${item.saboresIds.join("-")}`
        : item.idPizza
        ? `pizza-${item.idPizza}`
        : `pizza-${Date.now()}`;
    const cartItem = {
      ...item,
      id: item.id || fallbackId,
      quantidade: 1,
    };
    addItem(cartItem);
    showToast(`Adicionado: ${cartItem.nome}`);
  };

  const flavorOptions = useMemo(() => {
    if (!selectedPizza) return [];
    return pizzas.filter((pizza) => {
      if (String(pizza.id) === String(selectedPizza.id)) return false;
      const normalizedCategory = (pizza.categoria || "").toLowerCase();
      return normalizedCategory.includes("pizza");
    });
  }, [pizzas, selectedPizza]);

  const filteredFlavorOptions = useMemo(() => {
    const term = normalizeText(flavorSearch);
    if (!term) return flavorOptions;
    return flavorOptions.filter((pizza) => {
      const haystack = normalizeText(
        [pizza.nome, pizza.categoria, (pizza.ingredientes || []).join(" ")].join(" ")
      );
      return haystack.includes(term);
    });
  }, [flavorOptions, flavorSearch]);

  const bestPizzas = useMemo(() => popularPizzas, [popularPizzas]);

  const showDeliveryOutOfRange =
    isOpenNow && deliveryMode === "delivery" && withinDeliveryRadius === false;
  const needsDeliveryLocation =
    isOpenNow && deliveryMode === "delivery" && withinDeliveryRadius == null;

  return (
    <div className="space-y-6">
      <section className="space-y-5 rounded-[32px] bg-white/90 px-6 py-6 shadow-xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logopizzaria.png"
              alt="Pizzaria Anne & Tom"
              className="h-12 w-12 rounded-full object-contain"
            />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Pizzaria Anne & Tom
              </p>
              <p className="text-[11px] text-slate-500">Cardápio interno</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/checkout")}
            className="text-xs font-semibold uppercase tracking-wide rounded-full border border-slate-200 px-4 py-2 text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Checkout
          </button>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-black text-slate-900">
            Escolha suas pizzas
          </h1>
          <p className="text-sm text-slate-500">
            Clique para ver detalhes, montar ate 3 sabores e adicionar extras.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] ${
                isOpenNow
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isOpenNow ? "bg-emerald-200 animate-pulse" : "bg-amber-400"
                }`}
              />
              {isOpenNow ? "Aberto agora" : "Fechado no momento"}
            </span>
            <span className="text-xs text-slate-400">{OPENING_LABEL}</span>
            <span className="text-xs font-semibold text-slate-500">
              {scheduleCountdown}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Modo
            </span>
            <div className="inline-flex rounded-full bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setDeliveryMode("delivery")}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                  deliveryMode === "delivery"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600"
                }`}
              >
                Entrega
              </button>
              <button
                type="button"
                onClick={() => setDeliveryMode("pickup")}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                  deliveryMode === "pickup"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600"
                }`}
              >
                Retirada
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
            {!isOpenNow && (
              <span className="font-semibold text-amber-700">
                Fora do horario de entrega. Agende pelo WhatsApp.
              </span>
            )}
            {isOpenNow && deliveryMode === "pickup" && (
              <span className="font-semibold text-emerald-600">
                Retirada na loja sem taxa.
              </span>
            )}
            {isOpenNow && deliveryMode === "delivery" && checkingDelivery && (
              <span>Confirmando raio de entrega...</span>
            )}
            {isOpenNow &&
              deliveryMode === "delivery" &&
              !checkingDelivery &&
              withinDeliveryRadius === true && (
              <span className="font-semibold text-emerald-600">
                Entrega disponivel{" "}
                {Number.isFinite(deliveryDistanceKm)
                  ? `(${deliveryDistanceKm.toFixed(1)} km)`
                  : ""}
              </span>
            )}
            {isOpenNow &&
              deliveryMode === "delivery" &&
              !checkingDelivery &&
              withinDeliveryRadius === false && (
              <span className="font-semibold text-amber-700">
                Fora do raio de entrega (15 km).
              </span>
            )}
            {isOpenNow &&
              deliveryMode === "delivery" &&
              !checkingDelivery &&
              withinDeliveryRadius == null && (
              <span>Precisamos da sua localizacao para validar a entrega.</span>
            )}
            {isOpenNow && deliveryMode === "delivery" && deliveryError && (
              <span className="font-semibold text-red-600">{deliveryError}</span>
            )}
            {isOpenNow &&
              deliveryMode === "delivery" &&
              withinDeliveryRadius !== true && (
              <button
                type="button"
                onClick={requestLocation}
                className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Permitir localizacao
              </button>
            )}
            {!isOpenNow && (
              <a
                href={WHATSAPP_SCHEDULE_LINK}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-500"
              >
                Agendar no WhatsApp
              </a>
            )}
          </div>
          {isUsingCachedMenu && !menuError && (
            <p className="text-[11px] text-amber-600">
              (Usando cardápio salvo neste dispositivo)
            </p>
          )}
        </div>
      </section>

      <section className="rounded-[26px] border border-slate-200 bg-white/95 px-5 py-4 shadow-md backdrop-blur md:sticky md:top-3 md:z-20">
        <div className="flex gap-3 overflow-x-auto md:grid md:grid-cols-3 md:overflow-visible">
          <div className="min-w-[220px] flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 md:min-w-0">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Modalidade
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {deliveryMode === "pickup" ? "Retirada" : "Entrega"}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {isOpenNow ? scheduleCountdown : "Agende"}
            </span>
          </div>
          <div className="min-w-[220px] flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 md:min-w-0">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Taxa estimada
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {deliveryMode === "pickup"
                  ? "Sem taxa"
                  : showDeliveryOutOfRange
                  ? "Fora do raio"
                  : deliveryFee != null
                  ? formatCurrencyBRL(deliveryFee)
                  : "Calcular"}
              </p>
            </div>
            <span className="text-[11px] text-slate-500">
              {deliveryMode === "pickup"
                ? "Balcao"
                : deliveryDistanceText || "15 km max."}
            </span>
          </div>
          <div className="min-w-[220px] flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 md:min-w-0">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Tempo estimado
              </p>
              <p className="text-sm font-semibold text-slate-900">
                {deliveryMode === "pickup"
                  ? "Pronto em 30-40m"
                  : showDeliveryOutOfRange
                  ? "Indisponivel"
                  : needsDeliveryLocation
                  ? "Aguardando localizacao"
                  : deliveryDurationText || "Aguardando"}
              </p>
            </div>
            <span className="text-[11px] text-slate-500">
              {deliveryMode === "pickup"
                ? "Retire no local"
                : isOpenNow
                ? "Entrega"
                : "Fechado"}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-[28px] bg-white/90 px-5 py-5 shadow-sm border border-slate-200 backdrop-blur">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
            <span className="text-lg">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nome ou ingrediente..."
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
                {categoryOption === "todas" ? "Todas as categorias" : categoryOption}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Tipo
          </span>
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              typeFilter === "all"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            Todos
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("pizza")}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              typeFilter === "pizza"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            Só pizzas
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("doces")}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              typeFilter === "doces"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            Só doces
          </button>
        </div>
      </section>

      {menuError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {menuError}
        </div>
      )}

      {loadingMenu && (
        <div className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-500 shadow-sm">
          Carregando cardápio...
        </div>
      )}

      {recentItems.length > 0 && (
        <section className="space-y-3 rounded-[26px] border border-slate-200 bg-white/90 px-5 py-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xs uppercase font-semibold text-slate-500 tracking-wide">
              Últimos pedidos
            </h2>
            <button
              type="button"
              onClick={() => navigate("/pedidos")}
              className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-600"
            >
              Ver pedidos
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {recentItems.map((item, index) => (
              <div
                key={`${item.id || item.nome}-${index}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {item.nome}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {item.tamanho}
                    {Array.isArray(item.sabores) && item.sabores.length > 1
                      ? ` · ${item.sabores.join(" / ")}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleReorderItem(item)}
                  disabled={!canOrder}
                  className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Repetir
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {(loadingPopular || popularError || bestPizzas.length > 0) && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs uppercase font-semibold text-slate-500 tracking-wide">
                Mais pedidos hoje
              </h2>
              <p className="text-[11px] text-slate-400">
                {loadingPopular
                  ? "Carregando pedidos..."
                  : popularPizzas.length > 0
                  ? "Baseado nos pedidos reais"
                  : "Sem dados de pedidos ainda"}
              </p>
            </div>
            <span className="text-[11px] text-slate-400">
              Toque para ver detalhes
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {loadingPopular && bestPizzas.length === 0 && (
              <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-white p-4 text-[11px] text-slate-500">
                Carregando mais pedidos...
              </div>
            )}
            {!loadingPopular && bestPizzas.length === 0 && !popularError && (
              <div className="min-w-[220px] rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-[11px] text-slate-500">
                Ainda nao ha pedidos suficientes para mostrar aqui.
              </div>
            )}
            {bestPizzas.map((pizza) => (
              <div
                key={`best-${pizza.id}`}
                role="button"
                tabIndex={0}
                onClick={() => openPizzaModal(pizza)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    openPizzaModal(pizza);
                  }
                }}
                className="min-w-[220px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300"
              >
                <p className="text-xs uppercase text-slate-400">
                  {pizza.categoria}
                </p>
                <p className="text-sm font-semibold text-slate-900">
                  {pizza.nome}
                </p>
                <p className="text-[11px] text-slate-500">
                  {(pizza.ingredientes || []).join(", ")}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">
                    {formatCurrencyBRL(
                      pizza.preco_grande ?? pizza.preco_broto ?? 0
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={(event) => handleQuickAdd(pizza, event)}
                    disabled={!canOrder}
                    className="rounded-full border border-slate-200 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Pedir já
                  </button>
                </div>
              </div>
            ))}
          </div>
          {popularError && (
            <p className="text-[11px] text-amber-600">{popularError}</p>
          )}
        </section>
      )}

      <section className="space-y-4 pb-16">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs uppercase font-semibold text-slate-500 tracking-wide">
            Sabores disponíveis
          </h2>
          <p className="text-[11px] text-slate-500">
            Toque para montar seu pedido
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTER_PRESETS.map((filter) => (
            <button
              type="button"
              key={filter.key}
              onClick={() => setPreset(filter.key)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                preset === filter.key
                  ? "bg-slate-900 text-white shadow-lg"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {filteredPizzas.map((pizza) => {
            const allergenTags = getAllergenTags(pizza);
            return (
              <div
                key={pizza.id}
                role="button"
                tabIndex={0}
                onClick={() => openPizzaModal(pizza)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    openPizzaModal(pizza);
                  }
                }}
                className="flex w-full cursor-pointer flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-slate-300 hover:shadow-lg"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-orange-300 to-red-300 text-3xl">
                    🍕
                  </div>
                  <div className="flex-1">
                    <p className="text-xs uppercase text-slate-400">
                      {pizza.categoria}
                    </p>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {pizza.nome}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {(pizza.ingredientes || []).join(", ")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(pizza.badges || []).map((badge) => (
                        <span
                          key={`${pizza.id}-${badge}`}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600"
                        >
                          {BADGE_EMOJIS[badge] ? `${BADGE_EMOJIS[badge]} ` : ""}
                          {BADGE_LABELS[badge] || badge}
                        </span>
                      ))}
                      {allergenTags.map((tag) => (
                        <span
                          key={`${pizza.id}-${tag}`}
                          className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                        >
                          {ALLERGEN_EMOJIS[tag] ? `${ALLERGEN_EMOJIS[tag]} ` : ""}
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                  <div className="flex flex-wrap gap-3">
                    {pizza.preco_broto != null && (
                      <span>
                        Broto:{" "}
                        <span className="font-bold">
                          {formatCurrencyBRL(pizza.preco_broto)}
                        </span>
                      </span>
                    )}
                    {pizza.preco_grande != null && (
                      <span>
                        Grande:{" "}
                        <span className="font-bold">
                          {formatCurrencyBRL(pizza.preco_grande)}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          updateQuickQuantity(pizza.id, -1);
                        }}
                        className="h-6 w-6 rounded-full border border-slate-200 text-sm text-slate-600"
                      >
                        -
                      </button>
                      <span className="w-5 text-center">
                        {getQuickQuantity(pizza.id)}
                      </span>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          updateQuickQuantity(pizza.id, 1);
                        }}
                        className="h-6 w-6 rounded-full border border-slate-200 text-sm text-slate-600"
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => handleQuickAdd(pizza, event)}
                      disabled={!canOrder}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Adicionar ao carrinho
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {!loadingMenu && filteredPizzas.length === 0 && (
          <p className="text-xs text-slate-500">Nenhum sabor encontrado.</p>
        )}
      </section>

      {selectedPizza && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 px-4 py-6 md:items-center">
          <div
            ref={modalBodyRef}
            className="w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <div className="h-28 bg-slate-100 flex items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 via-orange-300 to-red-300 text-4xl">
                🍕
              </div>
            </div>
            <div className="space-y-6 px-6 py-6">
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedPizza.nome}
                </h2>
                <p className="text-sm text-slate-500">
                  {(selectedPizza.ingredientes || []).join(", ")}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                  Tamanho
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedPizza.preco_broto != null && (
                    <button
                      type="button"
                      onClick={() => setSelectedSize("broto")}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        selectedSize === "broto"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 text-slate-700 hover:border-slate-500"
                      }`}
                    >
                      Broto · {formatCurrencyBRL(selectedPizza.preco_broto)}
                    </button>
                  )}
                  {selectedPizza.preco_grande != null && (
                    <button
                      type="button"
                      onClick={() => setSelectedSize("grande")}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        selectedSize === "grande"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 text-slate-700 hover:border-slate-500"
                      }`}
                    >
                      Grande · {formatCurrencyBRL(selectedPizza.preco_grande)}
                    </button>
                  )}
                </div>
              </div>

              {selectedPizza && (
                <div className="space-y-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Pizza ate {maxTotalFlavors} sabores
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Selecione ate {maxAdditionalFlavors} sabor
                    {maxAdditionalFlavors > 1 ? "es" : ""} adicional
                    {maxAdditionalFlavors > 1 ? "es" : ""}.
                  </p>
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                    <span className="text-base">🔎</span>
                    <input
                      type="text"
                      placeholder="Buscar sabor..."
                      value={flavorSearch}
                      onChange={(event) => setFlavorSearch(event.target.value)}
                      className="flex-1 bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <div className="grid max-h-44 gap-2 overflow-y-auto pr-1">
                    {filteredFlavorOptions.map((pizza) => {
                      const id = String(pizza.id);
                      const isSelected = selectedFlavorIds.includes(id);
                      const isDisabled =
                        !isSelected &&
                        selectedFlavorIds.length >= maxAdditionalFlavors;
                      return (
                        <label
                          key={pizza.id}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <span>{pizza.nome}</span>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={() => toggleFlavor(id)}
                          />
                        </label>
                      );
                    })}
                  </div>
                  {!filteredFlavorOptions.length && (
                    <p className="text-[11px] text-slate-500">
                      Nenhum sabor encontrado.
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500">
                    Sabores selecionados: {1 + selectedFlavorIds.length}/
                    {maxTotalFlavors}
                  </p>
                </div>
              )}

              {extrasList.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-600">
                    Adicionais
                  </p>
                  <div className="grid gap-2">
                    {extrasList.map((extra, index) => {
                      const extraId = getExtraIdentifier(extra, index);
                      const extraPrice = safeNumber(
                        extra.preco ?? extra.valor ?? extra.price ?? extra.value ?? 0
                      );
                      return (
                        <label
                          key={extraId}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                        >
                          <span>{extra.nome || extra.name || `Adicional ${index + 1}`}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">
                              {formatCurrencyBRL(extraPrice)}
                            </span>
                            <input
                              type="checkbox"
                              checked={selectedExtras.includes(extraId)}
                              onChange={() => toggleExtra(extraId)}
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <textarea
                rows={3}
                placeholder="Observações (sem cebola, ponto da borda...)"
                value={observations}
                onChange={(event) => setObservations(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-500"
              />
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((prev) => (prev > 1 ? prev - 1 : 1))
                    }
                    className="h-9 w-9 rounded-full border border-slate-300 text-xl font-semibold leading-none text-slate-700"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-base font-semibold">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="h-9 w-9 rounded-full border border-slate-300 text-xl font-semibold leading-none text-slate-700"
                  >
                    +
                  </button>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    Total
                  </p>
                  <p className="text-lg font-semibold text-slate-900">
                    {formatCurrencyBRL(totalPrice)}
                  </p>
                </div>
              </div>

              {!canOrder && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
                  <p className="font-semibold">
                    {!isOpenNow
                      ? "Fora do horario de entrega."
                      : showDeliveryOutOfRange
                      ? "Fora do raio de entrega."
                      : needsDeliveryLocation
                      ? "Precisa de localizacao para entrega."
                      : "Indisponivel no momento."}
                  </p>
                  <p className="mt-1 text-amber-700">
                    {!isOpenNow
                      ? "Agende seu pedido pelo WhatsApp e confirmamos o horario."
                      : showDeliveryOutOfRange
                      ? "Voce pode tentar outro endereco dentro de 15 km."
                      : needsDeliveryLocation
                      ? "Permita a localizacao para liberar a entrega."
                      : "Tente novamente em instantes."}
                  </p>
                  {!isOpenNow && (
                    <a
                      href={WHATSAPP_SCHEDULE_LINK}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-500"
                    >
                      Falar no WhatsApp
                    </a>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={unitPrice <= 0 || !canOrder}
                  className="flex-1 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {editingItemKey ? "Atualizar carrinho" : "Adicionar ao carrinho"} · {formatCurrencyBRL(totalPrice)}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-full border border-slate-200 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-slate-700 transition hover:border-slate-400"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 shadow-xl">
          <p className="font-semibold">{toast.message}</p>
          <button
            type="button"
            onClick={() => navigate("/checkout")}
            className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 hover:text-emerald-600"
          >
            Ver carrinho
          </button>
        </div>
      )}
    </div>
  );
};

export default CardapioPage;
