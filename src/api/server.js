// src/api/server.js
import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_AT_API_BASE_URL || "https://api.annetom.com";

const API_KEY =
  import.meta.env.VITE_PUBLIC_API_TOKEN ||
  import.meta.env.VITE_AT_API_KEY ||
  "change-me-public";

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
        "ngrok-skip-browser-warning": "true",
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

const server = {
  fetchStatus,
  enviarParaDesktop,
  checkCustomerByPhone,
  salvarCliente,
  fetchMenu,
  confirmDelivery,
};

export default server;
