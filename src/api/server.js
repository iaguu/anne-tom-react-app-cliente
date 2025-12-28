// src/api/server.js
import axios from "axios";

const resolveBaseUrl = () => {
  const envValue = import.meta.env.VITE_AT_API_BASE_URL;
  if (envValue === "same-origin") {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return "";
  }
  return envValue || "https://api.annetom.com";
};

const BASE_URL = resolveBaseUrl();

const API_KEY =
  import.meta.env.VITE_PUBLIC_API_TOKEN ||
  import.meta.env.VITE_AT_API_KEY ||
  "change-me-public";

const AXION_API_KEY =
  import.meta.env.VITE_AXIONPAY_API_KEY ||
  import.meta.env.VITE_AXION_PAY_API_KEY ||
  "";
const AXION_BEARER =
  import.meta.env.VITE_AXIONPAY_BEARER ||
  import.meta.env.VITE_AXION_PAY_BEARER ||
  "";
const AXION_PIX_PATH =
  import.meta.env.VITE_AXIONPAY_PIX_PATH ||
  import.meta.env.VITE_AXION_PAY_PIX_PATH ||
  "/api/axionpay/pix";

const baseUrl = BASE_URL;
const xApiKey = API_KEY;

const toResponse = (response) => ({
  ok: response.status >= 200 && response.status < 300,
  status: response.status,
  data: response.data,
  json: async () => response.data,
  text: async () =>
    typeof response.data === "string"
      ? response.data
      : JSON.stringify(response.data),
  headers: {
    get: (name) =>
      response.headers?.[String(name || "").toLowerCase()] || null,
  },
});

const toErrorResponse = (error) => ({
  ok: false,
  status: error?.response?.status ?? 0,
  error,
  json: async () => ({
    error: String(error?.message || error),
    status: error?.response?.status ?? 0,
  }),
  text: async () => String(error?.message || error),
  headers: {
    get: () => null,
  },
});

const normalizePayload = (payload) => {
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch (_err) {
      return payload;
    }
  }
  return payload;
};

export const serverInstance = {
  baseDomain: {
    instance: axios.create({
      timeout: 15000,
      baseURL: baseUrl,
      validateStatus: () => true,
      headers: {
        Accept: "application/json",
        ...(xApiKey ? { "x-api-key": xApiKey } : {}),
      },
    }),
  },
};

const fetchStatus = async (id) => {
  try {
    const response = await serverInstance.baseDomain.instance.get(
      `/motoboy/pedido/${encodeURIComponent(id)}`
    );
    return toResponse(response);
  } catch (error) {
    console.error("[server.fetchStatus] erro:", error);
    return toErrorResponse(error);
  }
};

const enviarParaDesktop = async (params) => {
  try {
    const payload = normalizePayload(params);
    const response = await serverInstance.baseDomain.instance.post(
      "/api/orders",
      payload
    );
    return toResponse(response);
  } catch (error) {
    console.error("[server.enviarParaDesktop] erro:", error);
    return toErrorResponse(error);
  }
};

const checkCustomerByPhone = async (phone) => {
  try {
    const response = await serverInstance.baseDomain.instance.get(
    // o backend já espera o formato “limpo” (apenas dígitos)
      `/api/customers/by-phone?phone=${encodeURIComponent(phone)}`
    );
    return toResponse(response);
  } catch (error) {
    console.error("[server.checkCustomerByPhone] erro:", error);
    return toErrorResponse(error);
  }
};

const salvarCliente = async (params) => {
  try {
    const payload = normalizePayload(params);
    const response = await serverInstance.baseDomain.instance.post(
      "/api/customers",
      payload
    );
    return toResponse(response);
  } catch (error) {
    console.error("[server.salvarCliente] erro:", error);
    return toErrorResponse(error);
  }
};

const fetchMenu = async () => {
  try {
    const response = await serverInstance.baseDomain.instance.get("/api/menu");
    return toResponse(response);
  } catch (error) {
    console.error("[server.fetchMenu] erro:", error);
    return toErrorResponse(error);
  }
};

const confirmDelivery = async (orderId) => {
  try {
    const response = await serverInstance.baseDomain.instance.post(
      `/api/orders/${encodeURIComponent(orderId)}/status`,
      { status: "finalizado" }
    );
    return toResponse(response);
  } catch (error) {
    console.error("[server.confirmDelivery] erro:", error);
    return toErrorResponse(error);
  }
};

const createPixPayment = async (params = {}, idempotencyKey) => {
  try {
    const payload = normalizePayload(params);
    const headers = {
      ...(AXION_API_KEY ? { "x-api-key": AXION_API_KEY } : {}),
      ...(AXION_BEARER ? { Authorization: `Bearer ${AXION_BEARER}` } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    };
    const response = await serverInstance.baseDomain.instance.post(
      AXION_PIX_PATH,
      payload,
      {
        headers: Object.keys(headers).length ? headers : undefined,
      }
    );
    return toResponse(response);
  } catch (error) {
    console.error("[server.createPixPayment] erro:", error);
    return toErrorResponse(error);
  }
};

const server = {
  fetchStatus,
  enviarParaDesktop,
  checkCustomerByPhone,
  salvarCliente,
  fetchMenu,
  confirmDelivery,
  createPixPayment,
};

export default server;
