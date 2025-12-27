// src/utils/menu.js
export const MENU_CACHE_KEY = "anne_tom_menu_cache_v1";

export const formatCurrencyBRL = (value) =>
  (Number(value) || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const normalizeText = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export const normalizeBadgesFromItem = (item) => {
  const rawBadges = Array.isArray(item.badges) ? item.badges : [];
  const name = item.name || item.nome || "";
  const category = item.category || item.categoria || "";
  const ingredientes = Array.isArray(item.ingredientes) ? item.ingredientes : [];

  const text = normalizeText(`${name} ${category} ${ingredientes.join(" ")}`);
  const badgesSet = new Set();

  rawBadges.forEach((badge) => {
    const value = normalizeText(badge);

    if (value.includes("veggie") || value.includes("veg")) {
      badgesSet.add("veggie");
    } else if (
      value.includes("picante") ||
      value.includes("pimenta") ||
      value.includes("hot") ||
      value.includes("spicy")
    ) {
      badgesSet.add("hot");
    } else if (value.includes("mais pedido") || value.includes("best")) {
      badgesSet.add("best");
    } else if (
      value.includes("promo") ||
      value.includes("combo") ||
      value.includes("oferta")
    ) {
      badgesSet.add("promo");
    } else if (value.includes("novo") || value.includes("lancamento")) {
      badgesSet.add("new");
    }
  });

  if (text.includes("pimenta") || text.includes("apiment")) {
    badgesSet.add("hot");
  }

  const hasMeat =
    /calabresa|bacon|frango|carne|presunto|lombo|lingui[cç]a|peru|pepperoni|mignon|costela|salmao|camarao|atum|anchov|peixe|pernil/i.test(
      text
    );

  const hasVeggieHint =
    /mussarela|muzzarela|mozarela|queijo|ricota|gorgonzola|parmesao|catupiry|brocolis|milho|palmito|escaraola|rucula|tomate|berinjela|abobrinha|cebola|pimentao|champignon|azeitona|alcaparra|alho/i.test(
      text
    );

  if (!hasMeat && hasVeggieHint) {
    badgesSet.add("veggie");
  }

  const normName = normalizeText(name);
  if (
    /musa|calabresa|portuguesa|frango com catupiry|anne & tom|anne e tom|mucuripe|4 queijos|quatro queijos|marguerita|margherita/.test(
      normName
    )
  ) {
    badgesSet.add("best");
  }

  return Array.from(badgesSet);
};

export const normalizePizzasFromJson = (json) => {
  let items = [];

  if (!json) items = [];
  else if (Array.isArray(json)) items = json;
  else if (Array.isArray(json.products)) items = json.products;
  else if (Array.isArray(json.items)) items = json.items;
  else items = [];

  const safeNumber = (value) => {
    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  };

  return items
    .filter((item) => {
      if (item.active === false) return false;
      if (item.isAvailable === false) return false;
      return item.type === "pizza";
    })
    .map((item) => {
      const categoria = item.category || item.categoria || "Outros";
      const categoriaUpper = String(categoria).toUpperCase();

      let precoBroto = safeNumber(item.priceBroto ?? item.preco_broto);
      let precoGrande = safeNumber(item.priceGrande ?? item.preco_grande);

      if (categoriaUpper.includes("ESFIHA")) {
        const unitPrice = precoGrande != null ? precoGrande : precoBroto;
        precoBroto = null;
        precoGrande = unitPrice;
      }

      const badges = normalizeBadgesFromItem(item);

      return {
        id: String(item.id),
        nome: item.name || item.nome || "",
        categoria,
        ingredientes: Array.isArray(item.ingredientes) ? item.ingredientes : [],
        preco_broto: precoBroto,
        preco_grande: precoGrande,
        badges,
        extras: Array.isArray(item.extras) ? item.extras : [],
        sugestoes: Array.isArray(item.sugestoes) ? item.sugestoes : [],
      };
    });
};
