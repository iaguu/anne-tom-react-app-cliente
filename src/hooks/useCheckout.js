// src/hooks/useCheckout.js
import { useCallback, useRef, useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import server from "../api/server";
import {
  getFeeByDistance,
  getTaxaPorBairro,
  parseDistanceKm,
} from "../utils/deliveryFees";
import { getDistanceMatrix } from "../utils/googleMaps";

const {
  VITE_GOOGLE_MAPS_API_KEY: DISTANCE_MATRIX_API_KEY = "",
  VITE_DELIVERY_ORIGIN: DELIVERY_ORIGIN =
    "Pizzaria Anne & Tom, Alto de Santana, Sao Paulo",
} = import.meta.env;

const CHECKOUT_DRAFT_KEY = "checkout_draft";


/* ============ ENVIO PARA O DESKTOP (API NGROK) ============ */

async function enviarParaDesktop(items, dados, totalFinal, pagamento) {
  try {
    const payload = {
      source: "website",
      type: dados.retirada ? "pickup" : "delivery",
      status: "open",
      createdAt: new Date().toISOString(),

      customerId: dados.customerId || null,

      customerSnapshot: {
        id: dados.customerId || null,
        name: dados.nome,
        phone: dados.telefone?.replace(/\D/g, ""),
        address: {
          cep: dados.cep,
          street: dados.endereco,
          neighborhood: dados.bairro,
        },
      },

      payment: {
        method: pagamento,
        changeFor: pagamento === "dinheiro" ? dados.troco || null : null,
        status: "pending",
        pix:
          pagamento === "pix" && dados.pixPayment
            ? {
                providerReference: dados.pixPayment.providerReference || null,
                transactionId: dados.pixPayment.transactionId || null,
                copiaColar: dados.pixPayment.copiaColar || null,
                qrcode: dados.pixPayment.qrcode || null,
                expiresAt: dados.pixPayment.expiresAt || null,
              }
            : null,
      },

      delivery: {
        mode: dados.retirada ? "pickup" : "delivery",
        fee: dados.taxaEntrega,
      },

      items: items.map((i) => ({
        lineId: `${Date.now()}-${Math.random()}`,
        productId: i.idPizza || i.id,
        name: i.nome,
        size: i.tamanho,
        quantity: i.quantidade,
        unitPrice: i.precoUnitario,
        lineTotal: i.precoUnitario * i.quantidade,
        isHalfHalf: Array.isArray(i.sabores)
          ? i.sabores.length > 1
          : !!i.meio,
        halfDescription: Array.isArray(i.sabores)
          ? i.sabores.join(" / ")
          : i.meio || "",
        extras: Array.isArray(i.extras) ? i.extras : [],
      })),

      totals: {
        subtotal: dados.subtotal,
        deliveryFee: dados.taxaEntrega,
        discount: dados.desconto,
        finalTotal: totalFinal,
      },
    };

    console.log("📦 Enviando para desktop:", payload);

    const res = await server.enviarParaDesktop(JSON.stringify(payload));

    if (!res.ok) {
      const txt = await res.text();
      console.error("❌ Erro ao enviar:", res.status, txt);
      return { ok: false };
    }

    const data = await res.json();
    console.log("✅ Pedido salvo no desktop:", data);
    return { ok: true, data };
  } catch (err) {
    console.error("⚠ Falha na conexão API → desktop:", err);
    return { ok: false, error: err };
  }
}

/* ============ BUSCA DE CLIENTE POR TELEFONE (API DESKTOP) ============ */

async function checkCustomerByPhone(phoneRaw) {
  const phoneDigits = (phoneRaw || "").replace(/\D/g, "");

  if (!phoneDigits || phoneDigits.length < 10) {
    return { found: false, customer: null };
  }

  try {
    const res = await server.checkCustomerByPhone(
      encodeURIComponent(phoneDigits)
    );

    if (res.status === 404) {
      return { found: false, customer: null };
    }

    if (!res.ok) {
      const txt = await res.text();
      console.error("❌ Erro ao buscar cliente:", res.status, txt);
      return { found: false, customer: null };
    }

    const customer = await res.json();
    return { found: true, customer };
  } catch (err) {
    console.error("⚠ Falha ao consultar cliente:", err);
    return { found: false, customer: null, error: true };
  }
}

/* ============ SALVAR / CADASTRAR CLIENTE (POST) ============ */

async function salvarCliente(dadosCliente) {
  if (!dadosCliente?.telefone || !dadosCliente?.nome) return null;

  const phoneDigits = (dadosCliente.telefone || "").replace(/\D/g, "");

  const payload = {
    source: "website",
    name: dadosCliente.nome,
    phone: phoneDigits,
    address: {
      cep: dadosCliente.cep || "",
      street: dadosCliente.endereco || "",
      neighborhood: dadosCliente.bairro || "",
    },
  };

  try {
    const res = await server.salvarCliente(JSON.stringify(payload));

    if (!res.ok) {
      const txt = await res.text();
      console.error("❌ Erro ao salvar cliente:", res.status, txt);
      return null;
    }

    const customer = await res.json();
    console.log("✅ Cliente salvo/atualizado:", customer);
    return customer;
  } catch (err) {
    console.error("⚠ Falha na conexão API → customers:", err);
    return null;
  }
}

/* ================= HOOK PRINCIPAL ================== */

export function useCheckout() {
  const { items, total, updateQuantity, removeItem, clearCart, addItem } =
    useCart();

  // 0: Carrinho | 1: Dados | 2: Revisão | 3: Pagamento
  const [passo, setPasso] = useState(0);
  const [pagamento, setPagamento] = useState("pix");
  const [cupom, setCupom] = useState("");
  const [pixPayment, setPixPayment] = useState(null);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState("");
  const pixIdempotencyRef = useRef(null);
  const pixTotalRef = useRef(null);

  const { customer } = useAuth();

  const [dados, setDados] = useState({
    nome: "",
    telefone: "",
    cep: "",
    endereco: "",
    bairro: "",
    obsGerais: "",
    retirada: false,
    subtotal: total,
    taxaEntrega: 0,
    desconto: 0,
    customerId: null,
  });

  // auto | existing | novo
  const [tipoCliente, setTipoCliente] = useState("auto");

  const [clienteExistente, setClienteExistente] = useState(null);
  const [checandoCliente, setChecandoCliente] = useState(false);
  const [erroClienteApi, setErroClienteApi] = useState("");

  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erroCep, setErroCep] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [deliveryEta, setDeliveryEta] = useState(null);
  const [deliveryEtaLoading, setDeliveryEtaLoading] = useState(false);
  const [deliveryEtaError, setDeliveryEtaError] = useState("");
  const distanceKm = useMemo(
    () => parseDistanceKm(deliveryEta?.distanceText),
    [deliveryEta]
  );
  const distanceFee = useMemo(
    () => (distanceKm != null ? getFeeByDistance(distanceKm) : null),
    [distanceKm]
  );

  const etapas = ["Carrinho", "Dados", "Revisão", "Pagamento"];

  /* =========== LOCALSTORAGE CLIENTE =========== */

  useEffect(() => {
    try {
      const salvo = localStorage.getItem("checkout_cliente");
      if (salvo) {
        const parsed = JSON.parse(salvo);
        setDados((d) => ({ ...d, ...parsed }));
      }
    } catch {
      // ignora
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed.passo === "number") {
        const safeStep = Math.min(3, Math.max(0, parsed.passo));
        setPasso(safeStep);
      }
      if (parsed.pagamento) {
        setPagamento(parsed.pagamento);
      }
      if (typeof parsed.cupom === "string") {
        setCupom(parsed.cupom);
      }
      if (parsed.tipoCliente) {
        setTipoCliente(parsed.tipoCliente);
      }
    } catch {
      // ignora
    }
  }, []);

  useEffect(() => {
    const toSave = {
      nome: dados.nome,
      telefone: dados.telefone,
      cep: dados.cep,
      endereco: dados.endereco,
      bairro: dados.bairro,
      obsGerais: dados.obsGerais,
      retirada: dados.retirada,
      customerId: dados.customerId || null,
    };
    try {
      localStorage.setItem("checkout_cliente", JSON.stringify(toSave));
    } catch {
      // ignora
    }
  }, [
    dados.nome,
    dados.telefone,
    dados.cep,
    dados.endereco,
    dados.bairro,
    dados.obsGerais,
    dados.retirada,
    dados.customerId,
  ]);

  useEffect(() => {
    try {
      const payload = {
        passo,
        pagamento,
        cupom,
        tipoCliente,
      };
      localStorage.setItem(CHECKOUT_DRAFT_KEY, JSON.stringify(payload));
    } catch {
      // ignora
    }
  }, [passo, pagamento, cupom, tipoCliente]);

  useEffect(() => {
    if (!customer) return;

    setDados((prev) => ({
      ...prev,
      nome:
        prev.nome ||
        customer.nome ||
        customer.name ||
        customer.firstName ||
        customer.lastName ||
        prev.nome,
      telefone:
        prev.telefone || customer.telefone || customer.phone || prev.telefone,
      cep: prev.cep || customer.address?.cep || prev.cep,
      endereco:
        prev.endereco ||
        customer.address?.street ||
        customer.address?.endereco ||
        prev.endereco,
      bairro:
        prev.bairro ||
        customer.address?.neighborhood ||
        customer.address?.bairro ||
        prev.bairro,
      customerId:
        prev.customerId ||
        customer.id ||
        customer._id ||
        customer.customerId ||
        null,
    }));
    setTipoCliente("existing");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  /* =========== DERIVADOS =========== */

  const subtotal = total;
  const rawTaxa = distanceFee ?? getTaxaPorBairro(dados.bairro);
  const taxaEntrega = dados.retirada ? 0 : rawTaxa;
  const desconto = dados.desconto || 0;
  const totalFinal = useMemo(
    () => subtotal + taxaEntrega - desconto,
    [subtotal, taxaEntrega, desconto]
  );

  const deliveryFeeLabel =
    distanceFee != null
      ? `Distância (${distanceKm?.toFixed(1)} km)`
      : dados.bairro
      ? `Bairro ${dados.bairro}`
      : "Taxa padrão";

  const totalItens = useMemo(
    () => items.reduce((acc, i) => acc + i.quantidade, 0),
    [items]
  );

  const semItens = items.length === 0;

  const hasPixData =
    pagamento !== "pix" ||
    Boolean(pixPayment?.copiaColar || pixPayment?.qrcode);

  const podeEnviar =
    !semItens &&
    dados.nome.trim() &&
    dados.telefone.trim() &&
    (dados.retirada || dados.endereco.trim()) &&
    hasPixData &&
    !enviando;

  /* =========== CUPOM =========== */

  const aplicarCupom = () => {
    if (cupom.trim().toUpperCase() === "PRIMEIRA") {
      setDados((d) => ({ ...d, desconto: 5 }));
    } else {
      setDados((d) => ({ ...d, desconto: 0 }));
    }
  };

  /* =========== PIX (AXIONPAY) =========== */

  const resetPixPayment = useCallback(() => {
    setPixPayment(null);
    setPixError("");
    pixIdempotencyRef.current = null;
  }, []);

  useEffect(() => {
    if (pagamento !== "pix") {
      resetPixPayment();
    }
  }, [pagamento, resetPixPayment]);

  useEffect(() => {
    const previousTotal = pixTotalRef.current;
    pixTotalRef.current = totalFinal;

    if (pagamento !== "pix") return;
    if (previousTotal == null) return;
    if (previousTotal === totalFinal) return;
    if (!pixPayment) return;

    resetPixPayment();
  }, [totalFinal, pagamento, pixPayment, resetPixPayment]);

  const buildPixPayload = (customerIdAtual) => {
    const amountCents = Math.max(1, Math.round(totalFinal * 100));
    const phoneDigits = (dados.telefone || "").replace(/\D/g, "");

    return {
      amount_cents: amountCents,
      currency: "BRL",
      customer: {
        id: customerIdAtual || dados.customerId || null,
        name: dados.nome || undefined,
        phone: phoneDigits || undefined,
      },
      metadata: {
        source: "anne-tom-app",
        orderTotal: totalFinal,
        itemsCount: totalItens,
        customerId: customerIdAtual || dados.customerId || null,
      },
    };
  };

  const createPixPayment = async ({ force = false, customerId } = {}) => {
    if (pixPayment && !force) return pixPayment;

    setPixError("");
    setPixLoading(true);

    if (!pixIdempotencyRef.current || force) {
      pixIdempotencyRef.current =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `pix-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    }

    try {
      const requestPayload = buildPixPayload(customerId);
      const res = await server.createPixPayment(
        requestPayload,
        pixIdempotencyRef.current
      );

      // Wrapper toResponse (axios) → JSON está em res.data
      const data = res?.data;

      if (!res.ok || !data?.success || !data?.payload) {
        setPixError(
          data?.message ||
            data?.error ||
            "Nao foi possivel gerar o Pix agora."
        );
        return null;
      }

      const nextPixPayment = {
        transactionId: data.transactionId || null,
        providerReference: data.providerReference || null,
        status: data.status || "pending",
        amount: data.amount || totalFinal || null,
        amountCents:
          data.amount_cents || Math.max(1, Math.round(totalFinal * 100)),
        qrcode: data.qrcode || null,
        copiaColar: data.copia_colar || data.payload,
        expiresAt: data.expiresAt || data.expires_at || null,
        raw: data,
      };

      setPixPayment(nextPixPayment);
      return nextPixPayment;
    } catch (err) {
      console.error("[useCheckout] pix error:", err);
      setPixError("Nao foi possivel gerar o Pix agora.");
      return null;
    } finally {
      setPixLoading(false);
    }
  };

  /* =========== ETA ENTREGA (DISTANCE MATRIX) =========== */

  useEffect(() => {
    if (dados.retirada) {
      setDeliveryEta(null);
      setDeliveryEtaError("");
      return;
    }

    if (!DISTANCE_MATRIX_API_KEY) {
      return;
    }

    const destination = [dados.endereco, dados.bairro]
      .filter(Boolean)
      .join(", ");

    if (!destination || destination.length < 5) {
      setDeliveryEta(null);
      setDeliveryEtaError("");
      return;
    }

    let cancelled = false;
    const timeout = setTimeout(async () => {
      try {
        setDeliveryEtaLoading(true);
        setDeliveryEtaError("");

        const data = await getDistanceMatrix({
          apiKey: DISTANCE_MATRIX_API_KEY,
          origin: DELIVERY_ORIGIN,
          destination,
        });

        if (!cancelled) {
          setDeliveryEta({
            distanceText: data.distanceText || "",
            durationText: data.durationText || "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[useCheckout] ETA error:", err);
          setDeliveryEtaError("Nao foi possivel calcular o tempo de entrega.");
          setDeliveryEta(null);
        }
      } finally {
        if (!cancelled) setDeliveryEtaLoading(false);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [dados.endereco, dados.bairro, dados.retirada]);

  /* =========== CEP =========== */

  const buscarCep = async () => {
    const cepLimpo = (dados.cep || "").replace(/\D/g, "");
    if (cepLimpo.length !== 8) {
      setErroCep("CEP inválido. Use 8 dígitos.");
      return;
    }
    setErroCep("");
    setBuscandoCep(true);

    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const json = await resp.json();
      if (json.erro) {
        setErroCep("CEP não encontrado.");
      } else {
        const enderecoFormatado = `${json.logradouro || ""}, ${
          json.bairro || ""
        } - ${json.localidade || ""}/${json.uf || ""}`.trim();
        setDados((d) => ({
          ...d,
          endereco: enderecoFormatado,
          bairro: json.bairro || d.bairro,
        }));
      }
    } catch (e) {
      setErroCep("Erro ao buscar CEP. Tente novamente.");
    } finally {
      setBuscandoCep(false);
    }
  };

  /* =========== BUSCA DE CLIENTE POR TELEFONE =========== */

  const lastPhoneCheckedRef = useRef("");

  const onBuscarClientePorTelefone = async (telefoneAtual) => {
    const phoneDigits = (telefoneAtual || "").replace(/\D/g, "");

    // se apagou o telefone
    if (!phoneDigits) {
      setErroClienteApi("");
      setClienteExistente(null);
      lastPhoneCheckedRef.current = "";
      return;
    }

    // se ainda não tem dígitos suficientes
    if (phoneDigits.length < 10) return;

    // impede busca repetida
    if (checandoCliente) return;

    if (lastPhoneCheckedRef.current === phoneDigits) return;
    lastPhoneCheckedRef.current = phoneDigits;

    setChecandoCliente(true);

    const resultado = await checkCustomerByPhone(telefoneAtual);

    setChecandoCliente(false);

    if (resultado.error) {
      setErroClienteApi("Não foi possível consultar o cadastro agora.");
      return;
    }

    if (!resultado.found || !resultado.customer) {
      setErroClienteApi(
        "Cliente não encontrado. Complete seus dados para finalizar o cadastro."
      );
      setClienteExistente(null);

      setDados((d) => ({ ...d, customerId: null }));
      return;
    }

    const c = resultado.customer;
    setClienteExistente(c);

    setErroClienteApi(""); // só some quando realmente encontrou

    setDados((d) => ({
      ...d,
      customerId: c.id || d.customerId || null,
      nome: c.name || d.nome,
      cep: c.address?.cep || d.cep,
      endereco: c.address?.street || d.endereco || "",
      bairro: c.address?.neighborhood || d.bairro,
    }));
  };

  /* =========== NAVEGAÇÃO ENTRE ETAPAS =========== */

  const avancar = () => setPasso((p) => Math.min(p + 1, 3));
  const voltar = () => setPasso((p) => Math.max(p - 1, 0));
  const irParaStep = (idx) =>
    setPasso((p) => {
      if (idx < 0 || idx > 3) return p;
      return idx;
    });

  /* =========== ENVIO FINAL DO PEDIDO =========== */

  const enviarPedido = async () => {
    if (!podeEnviar) {
      return {
        success: false,
        error: "Dados incompletos para enviar o pedido.",
      };
    }

    setEnviando(true);

    try {
      // 1) garante cliente salvo
      let customerIdAtual = dados.customerId || null;
      if (!customerIdAtual) {
        const clienteSalvo = await salvarCliente(dados);
        if (clienteSalvo && clienteSalvo.id) {
          customerIdAtual = clienteSalvo.id;
          setDados((d) => ({ ...d, customerId: clienteSalvo.id }));
        }
      }

      let pixSnapshot = pixPayment;
      if (pagamento === "pix") {
        pixSnapshot = await createPixPayment({ customerId: customerIdAtual });
        if (!pixSnapshot) {
          return {
            success: false,
            error: "Falha ao gerar o Pix. Tente novamente.",
          };
        }
      }

      // 2) monta dados completos pro resumo / API
      const payloadCliente = {
        ...dados,
        customerId: customerIdAtual,
        subtotal,
        taxaEntrega,
        desconto,
      };

      // 3) envia para desktop
      const desktopResult = await enviarParaDesktop(
        items,
        {
          ...payloadCliente,
          pixPayment: pixSnapshot,
        },
        totalFinal,
        pagamento
      );

      // tenta extrair o pedido criado e o ID do backend
      let order = null;
      let backendOrderId = null;

      if (desktopResult && desktopResult.ok && desktopResult.data) {
        const data = desktopResult.data;
        if (data.order) {
          order = data.order;
        } else if (Array.isArray(data.items) && data.items.length > 0) {
          order = data.items[0];
        } else {
          order = data;
        }

        backendOrderId =
          order?.id ||
          data.orderId ||
          data.id ||
          (Array.isArray(data.items) && data.items[0]?.id) ||
          null;
      }

      // número "humano" pra exibir (#12345)
      const numeroPedidoHuman =
        order?.numeroPedido ||
        order?.codigoPedido ||
        (backendOrderId
          ? String(backendOrderId).split("-").slice(-1)[0]
          : null);

      // 4) monta resumo pro front
      const orderSummary = {
        items,
        subtotal,
        taxaEntrega,
        desconto,
        totalFinal,
        pixPayment: pixSnapshot,
        dados: payloadCliente,
        waText: montarTextoWhatsApp(
          items,
          {
            ...payloadCliente,
            subtotal,
            taxaEntrega,
            desconto,
          },
          totalFinal,
          pagamento
        ),
        numeroPedido: numeroPedidoHuman,
        codigoPedido: numeroPedidoHuman,
        backendOrderId,
        trackingId: backendOrderId,
      };

      // 5) salva resumo local
      try {
        localStorage.setItem("lastOrderSummary", JSON.stringify(orderSummary));
      } catch {
        // ignora
      }

      // 6) limpa carrinho apenas se o envio deu certo
      const wasSuccess = !!desktopResult?.ok;
      if (wasSuccess) {
        clearCart();
        try {
          localStorage.removeItem(CHECKOUT_DRAFT_KEY);
        } catch {
          // ignore
        }
      }

      // 7) devolve tudo pro CheckoutPage
      return {
        success: wasSuccess,
        order,
        orderSummary,
        orderId: backendOrderId,
        backendOrderId,
        trackingId: backendOrderId,
        raw: desktopResult,
      };
    } catch (err) {
      console.error("[useCheckout] erro ao enviar pedido:", err);
      return { success: false, error: err.message };
    } finally {
      setEnviando(false);
    }
  };

  return {
    // cart
    items,
    total,
    totalItens,

    // etapas
    passo,
    etapas,
    avancar,
    voltar,
    irParaStep,

    // dados cliente
    dados,
    setDados,
    tipoCliente,
    setTipoCliente,

    // estados de API cliente
    clienteExistente,
    checandoCliente,
    erroClienteApi,
    onBuscarClientePorTelefone,

    // CEP
    buscarCep,
    buscandoCep,
    erroCep,

    // cupom
    cupom,
    setCupom,
    aplicarCupom,

    // pagamento
    pagamento,
    setPagamento,
    pixPayment,
    pixLoading,
    pixError,
    createPixPayment,

    // totais
    subtotal,
    taxaEntrega,
    desconto,
    totalFinal,
    podeEnviar,
    enviando,
    deliveryEta,
    deliveryEtaLoading,
    deliveryEtaError,
    distanceKm,
    distanceFee,
    deliveryFeeLabel,

    // cart actions
    updateQuantity,
    removeItem,
    addItem,

    // envio
    enviarPedido,
  };
}
