// src/hooks/useCheckout.jsx
import { useCallback, useRef, useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import server from "../api/server";
import { getFeeByDistance, parseDistanceKm } from "../utils/deliveryFees";
import { getDistanceMatrix } from "../utils/googleMaps";



const DISTANCE_MATRIX_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
const DELIVERY_ORIGIN =
  import.meta.env.VITE_DELIVERY_ORIGIN ||
  "Pizzaria Anne & Tom, Alto de Santana, Sao Paulo";

const PAYMENT_SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutos
const PIX_SESSION_KEY = "axionpay_pix_session";
const CARD_SESSION_KEY = "axionpay_card_session";

const loadPaymentFromSession = (key, expectedTotal) => {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") return null;
    const createdAt = saved.createdAt || 0;
    const total = saved.total;
    if (!createdAt || typeof total !== "number") return null;

    if (Date.now() - createdAt > PAYMENT_SESSION_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }

    if (Math.abs((expectedTotal || 0) - total) > 0.01) return null;

    return saved.payment || null;
  } catch {
    return null;
  }
};

const savePaymentToSession = (key, total, payment) => {
  try {
    if (typeof sessionStorage === "undefined") return;
    const payload = {
      createdAt: Date.now(),
      total,
      payment,
    };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore
  }
};

/* ================= WHATSAPP BUILDER ================== */

const montarTextoWhatsApp = (itens, cliente, totalFinal, pagamento) => {
  const itensStr = itens
    .map((i) => {
      const totalItem = (i.precoUnitario * i.quantidade)
        .toFixed(2)
        .replace(".", ",");

      const saboresTexto =
        Array.isArray(i.sabores) && i.sabores.length > 1
          ? ` · sabores: ${i.sabores.join(" / ")}`
          : i.meio
          ? ` · meio a meio com ${i.meio}`
          : "";
      const obsPizza = i.obsPizza ? `\n    Obs: ${i.obsPizza}` : "";
      const extrasTexto =
        Array.isArray(i.extras) && i.extras.length > 0
          ? `\n    Adicionais: ${i.extras.join(", ")}`
          : "";
      const bordaTexto = i.borda ? `\n    Borda: ${i.borda}` : "";

      return `• ${i.quantidade}x ${i.nome} (${i.tamanho}${saboresTexto}) — R$ ${totalItem}${obsPizza}${extrasTexto}${bordaTexto}`;
    })
    .join("\n");

  return (
    `🍕 *Pedido Anne & Tom*` +
    `\n\n*Itens:*` +
    `\n${itensStr}` +
    `\n\n*Subtotal:* R$ ${cliente.subtotal.toFixed(2).replace(".", ",")}` +
    `\n*Taxa de entrega:* R$ ${cliente.taxaEntrega
      .toFixed(2)
      .replace(".", ",")}` +
    `\n*Desconto:* - R$ ${cliente.desconto.toFixed(2).replace(".", ",")}` +
    `\n\n*Total final:* R$ ${totalFinal.toFixed(2).replace(".", ",")}` +
    `\n*Pagamento:* ${pagamento.toUpperCase()}` +
    `\n\n*Cliente:* ${cliente.nome}` +
    `\n*Telefone:* ${cliente.telefone}` +
    `\n*CEP:* ${cliente.cep}` +
    `\n*Endereço:* ${cliente.endereco}` +
    `\n*Bairro:* ${cliente.bairro}` +
    (cliente.obsGerais ? `\n\n*Observações gerais:* ${cliente.obsGerais}` : "")
  );
};

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

      items: items.map((i) => {
        const extras = Array.isArray(i.extras) ? i.extras : [];
        const extrasPayload = i.borda
          ? [...extras, `Borda: ${i.borda}`]
          : extras;

        return {
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
          extras: extrasPayload,
          border: i.borda || null,
        };
      }),

      totals: {
        subtotal: dados.subtotal,
        deliveryFee: dados.taxaEntrega,
        discount: dados.desconto,
        finalTotal: totalFinal,
      },
    };

    const res = await server.enviarParaDesktop(JSON.stringify(payload));

    if (!res.ok) {
      const txt = await res.text();
      console.error("❌ Erro ao enviar:", res.status, txt);
      return { ok: false };
    }

    const data = await res.json();
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
  const pixAutoKeyRef = useRef(null);

  // CARTÃO (AXIONPAY)
  const [cardPayment, setCardPayment] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState("");
  const cardIdempotencyRef = useRef(null);
  const cardTotalRef = useRef(null);
  const cardAutoKeyRef = useRef(null);

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
  const telefoneDigits = useMemo(
    () => (dados.telefone || "").replace(/\D/g, ""),
    [dados.telefone]
  );
  const cepDigits = useMemo(
    () => (dados.cep || "").replace(/\D/g, ""),
    [dados.cep]
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
  const rawTaxa = distanceFee ?? 0;
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

  const dadosBasicosValidos =
    Boolean(dados.nome.trim()) &&
    telefoneDigits.length >= 10 &&
    tipoCliente !== "auto";
  const enderecoValido = dados.retirada
    ? true
    : Boolean(dados.endereco.trim()) &&
      Boolean(dados.bairro.trim()) &&
      cepDigits.length === 8;
  const dadosValidos = dadosBasicosValidos && enderecoValido;
  const distanciaOk = dados.retirada
    ? true
    : distanceFee != null && !deliveryEtaLoading && !deliveryEtaError;
  const podeAvancarDados = dadosValidos && distanciaOk;

  const cardCheckoutUrl = useMemo(() => {
    if (!cardPayment) return "";
    return (
      cardPayment.checkoutUrl ||
      cardPayment?.metadata?.providerRaw?.url ||
      cardPayment?.metadata?.url ||
      cardPayment?.url ||
      ""
    );
  }, [cardPayment]);

  const hasPixData =
    pagamento !== "pix" ||
    Boolean(pixPayment?.copiaColar || pixPayment?.qrcode);

  const hasCardData =
    pagamento !== "cartao" || Boolean(cardCheckoutUrl);

  const podeEnviar =
    !semItens && podeAvancarDados && hasPixData && hasCardData && !enviando;

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
    pixTotalRef.current = null;
    pixAutoKeyRef.current = null;
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(PIX_SESSION_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const previousTotal = pixTotalRef.current;
    pixTotalRef.current = totalFinal;

    if (previousTotal == null) return;
    if (previousTotal === totalFinal) return;
    if (!pixPayment) return;

    resetPixPayment();
  }, [totalFinal, pixPayment, resetPixPayment]);

  const buildPixPayload = (customerIdAtual) => {
    const amount = Number(totalFinal.toFixed(2));
    const phoneDigits = (dados.telefone || "").replace(/\D/g, "");

    return {
      amount,
      customer: {
        name: dados.nome || "Cliente",
        email: dados.email || undefined,
      },
      metadata: {
        source: "anne-tom-site",
        orderId:
          dados.orderId ||
          customerIdAtual ||
          dados.customerId ||
          undefined,
        customerPhone: phoneDigits || undefined,
      },
    };
  };

  const createPixPayment = async ({ force = false, customerId } = {}) => {
    if (!force && pixPayment) return pixPayment;

    if (!force && !pixPayment) {
      const cached = loadPaymentFromSession(PIX_SESSION_KEY, totalFinal);
      if (cached) {
        setPixPayment(cached);
        pixTotalRef.current = totalFinal;
        return cached;
      }
    }

    setPixError("");
    setPixLoading(true);

    try {
      if (!pixIdempotencyRef.current || force) {
        pixIdempotencyRef.current =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `pix-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      }

      const requestPayload = buildPixPayload(customerId);
      const res = await server.createPixPayment(
        requestPayload,
        pixIdempotencyRef.current
      );
      const data = await res.json().catch(() => null);

      if (!res.ok || !data) {
        setPixError(
          data?.message || "Nao foi possivel gerar o Pix agora."
        );
        return null;
      }

      let copiaColar = null;
      let qrcode = null;
      let transactionId = null;
      let providerReference = null;
      let status = null;
      let amount = Number(totalFinal.toFixed(2));
      let amountCents = Math.round(amount * 100);

      if (typeof data.payload === "string") {
        copiaColar = data.payload;
      }

      const tx = data.transaction || data.data || null;
      if (tx) {
        transactionId = tx.id || tx.transactionId || transactionId;
        providerReference = tx.providerReference || providerReference;
        status = tx.status || status;
        amount = tx.amount != null ? tx.amount : amount;
        amountCents = tx.amountCents || tx.amount_cents || amountCents;

        const metaPix = tx.metadata?.pix || tx.metadata || {};
        if (!copiaColar) {
          copiaColar =
            metaPix.copia_colar ||
            metaPix.copiaColar ||
            metaPix.copyPaste ||
            metaPix.pix_payload ||
            null;
        }
        qrcode =
          metaPix.qrcode ||
          metaPix.qrCode ||
          metaPix.qr_code ||
          metaPix.pix_qr_code ||
          null;
      }

      if (!copiaColar) {
        setPixError("Nao foi possivel gerar o Pix agora.");
        return null;
      }

      const nextPixPayment = {
        transactionId,
        providerReference,
        status,
        amount,
        amountCents,
        qrcode,
        copiaColar,
        expiresAt: null,
        raw: data,
      };

      setPixPayment(nextPixPayment);
      savePaymentToSession(PIX_SESSION_KEY, totalFinal, nextPixPayment);
      pixTotalRef.current = totalFinal;
      return nextPixPayment;
    } catch (err) {
      console.error("[useCheckout] pix error:", err);
      setPixError("Nao foi possivel gerar o Pix agora.");
      return null;
    } finally {
      setPixLoading(false);
    }
  };

  /* =========== CARTÃO (AXIONPAY) =========== */

  const resetCardPayment = useCallback(() => {
    setCardPayment(null);
    setCardError("");
    cardIdempotencyRef.current = null;
    cardTotalRef.current = null;
    cardAutoKeyRef.current = null;
    try {
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem(CARD_SESSION_KEY);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const previousTotal = cardTotalRef.current;
    cardTotalRef.current = totalFinal;

    if (previousTotal == null) return;
    if (previousTotal === totalFinal) return;
    if (!cardPayment) return;

    resetCardPayment();
  }, [totalFinal, cardPayment, resetCardPayment]);

  const buildCardPayload = () => {
    const amount = Number(totalFinal.toFixed(2));
    const returnBase = "https://annetom.com/confirmacao";
    const successUrl = `${returnBase}?paymentStatus=paid`;
    const failureUrl = `${returnBase}?paymentStatus=failed`;
    return {
      amount,
      customer: {
        name: dados.nome,
        email: dados.email,
        phone_number: dados.telefone,
      },
      card: dados.card || undefined,
      return_url: returnBase,
      success_url: successUrl,
      failure_url: failureUrl,
      metadata: {
        address: {
          cep: dados.cep,
          street: dados.endereco,
          neighborhood: dados.bairro,
          number: dados.numero,
          complement: dados.complemento,
        },
        orderId: dados.orderId || undefined,
        redirect_url: returnBase,
        webhook_url: "https://pdv.axionenterprise.cloud/annetom/api/order/confirm",
      },
    };
  };

  const createCardPayment = async ({ force = false } = {}) => {
    if (!force && cardPayment) return cardPayment;

    if (!force && !cardPayment) {
      const cached = loadPaymentFromSession(CARD_SESSION_KEY, totalFinal);
      if (cached) {
        setCardPayment(cached);
        return cached;
      }
    }

    setCardError("");
    setCardLoading(true);

    try {
      if (!cardIdempotencyRef.current || force) {
        cardIdempotencyRef.current =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `card-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      }

      const requestPayload = buildCardPayload();
      const res = await server.createCardPayment(
        requestPayload,
        cardIdempotencyRef.current
      );
      const data = await res.json().catch(() => null);
      const responsePayload = data?.transaction || data?.data || null;

      if (!res.ok || !responsePayload) {
        setCardError(
          data?.message || "Nao foi possivel processar o cartao agora."
        );
        return null;
      }

      setCardPayment(responsePayload);
      savePaymentToSession(CARD_SESSION_KEY, totalFinal, responsePayload);
      cardTotalRef.current = totalFinal;

      return responsePayload;
    } catch (err) {
      console.error("[useCheckout] card error:", err);
      setCardError("Nao foi possivel processar o cartao agora.");
      return null;
    } finally {
      setCardLoading(false);
    }
  };

  // Geracao automatica das transacoes de pagamento (PIX/cartao) ao entrar no passo "Pagamento"
  useEffect(() => {
    if (passo !== 3) {
      pixAutoKeyRef.current = null;
      cardAutoKeyRef.current = null;
      return;
    }

    if (!pixPayment && !pixLoading) {
      const pixKey = `pix:${totalFinal.toFixed(2)}`;
      if (pixAutoKeyRef.current !== pixKey) {
        pixAutoKeyRef.current = pixKey;
        createPixPayment().catch(() => {});
      }
    }

    if (!cardPayment && !cardLoading) {
      const cardKey = `card:${totalFinal.toFixed(2)}`;
      if (cardAutoKeyRef.current !== cardKey) {
        cardAutoKeyRef.current = cardKey;
        createCardPayment().catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    passo,
    totalFinal,
    pixPayment,
    pixLoading,
    cardPayment,
    cardLoading,
  ]);

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

    if (!phoneDigits) {
      setErroClienteApi("");
      setClienteExistente(null);
      lastPhoneCheckedRef.current = "";
      return;
    }

    if (phoneDigits.length < 10) return;
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
    setErroClienteApi("");

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

  const avancar = () =>
    setPasso((p) => {
      if (p === 0 && semItens) return p;
      if (p === 1 && !podeAvancarDados) return p;
      return Math.min(p + 1, 3);
    });

  const voltar = () => setPasso((p) => Math.max(p - 1, 0));

  const irParaStep = (idx) =>
    setPasso((p) => {
      if (idx < 0 || idx > 3) return p;
      if (idx > 0 && semItens) return p;
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

      const payloadCliente = {
        ...dados,
        customerId: customerIdAtual,
        subtotal,
        taxaEntrega,
        desconto,
      };

      const desktopResult = await enviarParaDesktop(
        items,
        {
          ...payloadCliente,
          pixPayment: pixSnapshot,
        },
        totalFinal,
        pagamento
      );

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

      const numeroPedidoHuman =
        order?.numeroPedido ||
        order?.codigoPedido ||
        (backendOrderId
          ? String(backendOrderId).split("-").slice(-1)[0]
          : null);

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

      try {
        localStorage.setItem("lastOrderSummary", JSON.stringify(orderSummary));
      } catch {
        // ignore
      }

      const wasSuccess = !!desktopResult?.ok;
      if (wasSuccess) {
        clearCart();
      }

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

    // PIX
    pixPayment,
    pixLoading,
    pixError,
    createPixPayment,
    resetPixPayment,

    // CARTÃO
    cardPayment,
    cardLoading,
    cardError,
    createCardPayment,
    cardCheckoutUrl,

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
    dadosValidos,
    podeAvancarDados,

    // cart actions
    updateQuantity,
    removeItem,
    addItem,

    // envio
    enviarPedido,
  };
}
