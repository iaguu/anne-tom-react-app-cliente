import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import svgr from "vite-plugin-svgr";

const DEFAULT_DEV_PORT = 5173;
const DEFAULT_PREVIEW_PORT = 4173;

const resolvePort = async (requestedPort, label, detectPort) => {
  const port = await detectPort(requestedPort);
  if (port !== requestedPort) {
    console.warn(
      `[vite] ${label} port ${requestedPort} is busy; falling back to ${port}`
    );
  }
  return port;
};

const parsePort = (value, fallback) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const buildPlugins = () => [
  react(),
  svgr(),
  VitePWA({
    registerType: "autoUpdate",
    includeAssets: ["favicon.ico", "apple-touch-icon.png", "robots.txt"],
    manifest: {
      name: "Anne & Tom - Pedidos",
      short_name: "Anne&Tom",
      description: "App de pedidos da Pizzaria Anne & Tom para WebView Android.",
      theme_color: "#006644",
      background_color: "#ffffff",
      display: "standalone",
      scope: "/",
      start_url: "/",
      icons: [
        {
          src: "pwa-192x192.png",
          sizes: "192x192",
          type: "image/png"
        },
        {
          src: "pwa-512x512.png",
          sizes: "512x512",
          type: "image/png"
        }
      ]
    },
    workbox: {
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.origin === self.location.origin,
          handler: "CacheFirst",
          options: {
            cacheName: "static-resources",
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 30
            }
          }
        },
        {
          urlPattern: ({ url }) => url.pathname.startsWith("/api"),
          handler: "NetworkFirst",
          options: {
            cacheName: "api-cache",
            networkTimeoutSeconds: 5,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24
            }
          }
        }
      ]
    }
  })
];

export default defineConfig(async () => {
  const detectPortModule = await import("detect-port");
  const detectPort =
    detectPortModule?.default && typeof detectPortModule.default === "function"
      ? detectPortModule.default
      : detectPortModule;
  const requestedDevPort = parsePort(
    process.env.VITE_DEV_PORT || process.env.PORT,
    DEFAULT_DEV_PORT
  );
  const requestedPreviewPort = parsePort(
    process.env.VITE_PREVIEW_PORT,
    DEFAULT_PREVIEW_PORT
  );

  const devPort = await resolvePort(
    requestedDevPort,
    "development server",
    detectPort
  );
  const previewPort = await resolvePort(
    requestedPreviewPort,
    "preview server",
    detectPort
  );

  return {
    envPrefix: ["VITE_", "SYNC_TOKEN", "PUBLIC_API_TOKEN"],
    plugins: buildPlugins(),
    server: {
      port: devPort,
      host: true,
      proxy: {
        "/api": {
          target: "https://api.annetom.com",
          changeOrigin: true,
          secure: true
        },
        "/motoboy": {
          target: "https://api.annetom.com",
          changeOrigin: true,
          secure: true
        }
      }
    },
    preview: {
      port: previewPort,
      host: true
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/test/setupTests.js",
      globals: true
    }
  };
});
