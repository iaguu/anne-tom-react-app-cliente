// src/hooks/useMenuData.js
import { useEffect, useMemo, useState } from "react";
import server from "../api/server";
import { MENU_CACHE_KEY, normalizePizzasFromJson } from "../utils/menu";

const readCache = () => {
  try {
    const cachedRaw = window.localStorage?.getItem(MENU_CACHE_KEY);
    return cachedRaw ? JSON.parse(cachedRaw) : null;
  } catch {
    return null;
  }
};

export const useMenuData = () => {
  const [menuData, setMenuData] = useState(null);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [menuError, setMenuError] = useState("");
  const [isUsingCachedMenu, setIsUsingCachedMenu] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchMenu = async () => {
      try {
        setLoadingMenu(true);
        setMenuError("");
        setIsUsingCachedMenu(false);

        const res = await server.fetchMenu();

        if (!res.ok) {
          throw new Error(`Falha no menu (HTTP ${res.status})`);
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          const rawText = await res.text();
          console.error("[Menu] Resposta nao JSON da API:", rawText.slice(0, 400));
          throw new Error("Resposta da API nao esta em JSON.");
        }

        const data = await res.json();
        if (!isMounted) return;

        setMenuData(data);
        setIsUsingCachedMenu(false);

        try {
          const payload = { data, savedAt: new Date().toISOString() };
          window.localStorage?.setItem(MENU_CACHE_KEY, JSON.stringify(payload));
        } catch (storageErr) {
          console.warn("[Menu] Nao foi possivel salvar cache local:", storageErr);
        }
      } catch (err) {
        console.error("[Menu] Erro ao buscar API de menu:", err);
        if (!isMounted) return;

        const cached = readCache();
        if (cached?.data) {
          setMenuData(cached.data);
          setIsUsingCachedMenu(true);
          setMenuError(
            "Nao foi possivel conectar a API. Usando cardapio salvo neste dispositivo."
          );
        } else {
          setMenuError("Erro ao carregar cardapio. Tente novamente.");
        }
      } finally {
        if (isMounted) setLoadingMenu(false);
      }
    };

    fetchMenu();
    return () => {
      isMounted = false;
    };
  }, []);

  const pizzas = useMemo(() => normalizePizzasFromJson(menuData), [menuData]);

  return {
    menuData,
    pizzas,
    loadingMenu,
    menuError,
    isUsingCachedMenu,
  };
};
