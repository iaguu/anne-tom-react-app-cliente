export const DELIVERY_FEE_RANGES = [
  { min: 0, max: 0.8, fee: 3.5 },
  { min: 0.81, max: 1.5, fee: 5.9 },
  { min: 1.6, max: 2, fee: 7.5 },
  { min: 2.1, max: 4, fee: 8.9 },
  { min: 4.1, max: 5.5, fee: 10.9 },
  { min: 5.6, max: 9, fee: 12.9 },
  { min: 9.1, max: 11.5, fee: 18 },
  { min: 11.6, max: 15, fee: 22 },
];

export const TAXAS_POR_BAIRRO = {
  Santana: 6,
  "Alto de Santana": 7,
  Tucuruvi: 7,
  Mandaqui: 7,
  "Santa Teresinha": 7,
  "Casa Verde": 8,
  "Vila Guilherme": 9,
  "Outros bairros": 10,
};

export const getFeeByDistance = (km) => {
  if (km == null || Number.isNaN(km)) return null;
  const found = DELIVERY_FEE_RANGES.find(
    (range) => km >= range.min && km <= range.max
  );
  return found ? found.fee : null;
};

export const parseDistanceKm = (text) => {
  if (!text) return null;
  const kmMatch = String(text).match(/([\d.,]+)\s*km/i);
  if (kmMatch) {
    return Number(kmMatch[1].replace(",", "."));
  }
  const mMatch = String(text).match(/([\d.,]+)\s*m/i);
  if (mMatch) {
    const meters = Number(mMatch[1].replace(",", "."));
    return Number.isFinite(meters) ? meters / 1000 : null;
  }
  return null;
};

export const getTaxaPorBairro = (bairro) => {
  if (!bairro) return 0;
  if (TAXAS_POR_BAIRRO[bairro] != null) return TAXAS_POR_BAIRRO[bairro];
  if (TAXAS_POR_BAIRRO["Outros bairros"] != null) {
    return TAXAS_POR_BAIRRO["Outros bairros"];
  }
  return 0;
};
