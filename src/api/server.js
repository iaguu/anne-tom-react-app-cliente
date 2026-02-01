// src/api/server.js
import axios from "axios";

const apiKey = import.meta.env.VITE_AT_API_KEY;
const publicToken = import.meta.env.VITE_PUBLIC_API_TOKEN;
const authToken = apiKey || publicToken;
const axionApiKey = import.meta.env.VITE_AXIONPAY_API_KEY || "change-me-public";
const axionPayTag = import.meta.env.VITE_AXIONPAY_PAY_TAG || "user-test";

const atBaseUrl = import.meta.env.VITE_AT_API_BASE_URL || "https://pdv.axionenterprise.cloud/annetom";
const normalizeBaseUrl = (base) => String(base || "").replace(/\/+$/, "");
const baseDomainUrl = normalizeBaseUrl(atBaseUrl).replace(/\/api$/, "");
const buildAxionProxyUrl = (base) => {
  const normalized = normalizeBaseUrl(base);
  if (!normalized) return "";
  return normalized.endsWith("/api")
    ? `${normalized}/axionpay`
    : `${normalized}/api/axionpay`;
};
const axionBaseUrl =
  import.meta.env.VITE_AXIONPAY_BASE_URL ||
  buildAxionProxyUrl(atBaseUrl) ||
  "https://pay.axionenterprise.cloud";

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
      baseURL: baseDomainUrl,
      validateStatus: () => true,
      headers: {
        Accept: "application/json",
        "ngrok-skip-browser-warning": "true",
        ...(authToken ? { "x-api-key": authToken } : {}),
      },
    }),
  },
  paymentsDomain: {
    instance: axios.create({
      timeout: 15000,
      baseURL: axionBaseUrl,
      validateStatus: () => true,
      headers: {
        Accept: "application/json",
        "x-api-key": axionApiKey,
        "pay-tag": axionPayTag,
      },
    }),
  },
};

const fetchStatus = async (id) => {
  try {
    const response = await serverInstance.baseDomain.instance.get(
      `/api/motoboy/pedido/${encodeURIComponent(id)}`
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
    const response = await serverInstance.paymentsDomain.instance.post(
      "/payments/pix",
      payload,
      {
        headers: idempotencyKey
          ? { "Idempotency-Key": idempotencyKey }
          : undefined,
      }
    );
    return toResponse(response);
  } catch (error) {
    console.error("[server.createPixPayment] erro:", error);
    return toErrorResponse(error);
  }
};

const createCardPayment = async (params = {}, idempotencyKey) => {
  try {
    const payload = normalizePayload(params);
    const response = await serverInstance.paymentsDomain.instance.post(
      "/payments/card",
      payload,
      {
        headers: idempotencyKey
          ? { "Idempotency-Key": idempotencyKey }
          : undefined,
      }
    );
    return toResponse(response);
  } catch (error) {
    console.error("[server.createCardPayment] erro:", error);
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
  createCardPayment,
};

export default server;
