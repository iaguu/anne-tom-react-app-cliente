// src/pages/LoginPage.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DiscountWheel from "../components/DiscountWheel";

const maskPhone = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const LoginPage = () => {
  const { customer, loadingAuth, loginOrRegister } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [addressError, setAddressError] = useState("");
  const [deliveryCheck, setDeliveryCheck] = useState(null); // {ok: true/false, km: number}
  const [reviewStep, setReviewStep] = useState(false);
  const [cpf, setCpf] = useState("");
  const [cep, setCep] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [isNewClient, setIsNewClient] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [address, setAddress] = useState("");
  const [addressConfirmed, setAddressConfirmed] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [clientCreated, setClientCreated] = useState(false);

  useEffect(() => {
    if (customer) {
      navigate(from, { replace: true });
    }
  }, [customer, from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAddressError("");

    const rawPhone = phone.replace(/\D/g, "");
    if (!rawPhone) {
      setError("Informe um telefone válido.");
      return;
    }

    // 1. Verifica se o cliente existe
    let foundClient = null;
    try {
      const apiKey = import.meta.env.VITE_API_KEY || "change-me-public";
      const resp = await fetch(`https://api.annetom.com/api/customers/by-phone?phone=${encodeURIComponent(rawPhone)}`, {
        headers: {
          "x-api-key": apiKey
        }
      });
      if (resp.ok) {
        foundClient = await resp.json();
      }
    } catch {}

    if (foundClient) {
      // Cliente existe, faz login normalmente
      const result = await loginOrRegister({ name, phone: rawPhone });
      if (!result.ok) {
        setError(result.error || "Não foi possível entrar. Tente novamente.");
        return;
      }
      navigate(from, { replace: true });
      return;
    }

    // 2. Se não existe, pede localização
    setIsNewClient(true);
    setShowLocationPrompt(true);
    setAddress("");
    setAddressConfirmed(false);
    setLocationDenied(false);
    setClientCreated(false);
  };

  // Geolocation + reverse geocoding
  const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  const handleLocationPermission = async () => {
    setLoadingLocation(true);
    setLocationDenied(false);
    setAddressError("");
    if (!navigator.geolocation) {
      setLocationDenied(true);
      setLoadingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const resp = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`
          );
          const data = await resp.json();
          const result = data.results?.[0];
          if (result && result.formatted_address) {
            setAddress(result.formatted_address);
            setShowLocationPrompt(false);
          } else {
            setAddress("");
            setAddressError("Não foi possível obter seu endereço automaticamente. Digite manualmente.");
            setLocationDenied(true);
            setShowLocationPrompt(false);
          }
        } catch {
          setAddress("");
          setAddressError("Erro ao buscar endereço. Digite manualmente.");
          setLocationDenied(true);
          setShowLocationPrompt(false);
        }
        setLoadingLocation(false);
      },
      () => {
        setLocationDenied(true);
        setLoadingLocation(false);
        setShowLocationPrompt(false);
      }
    );
  };

  const handleWheelFinished = (result) => {
    setLastResult(result);
    navigate(from, { replace: true });
  };

  const phoneDigits = phone.replace(/\D/g, "");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-md max-w-md mx-auto mt-8">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight text-[#264d3d]">Entrar</h1>
        <p className="mt-2 text-sm text-slate-500">Informe seu WhatsApp para acessar o cardápio e acompanhar pedidos.</p>
      </div>

      {/* Formulário principal */}
      {!isNewClient && (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">WhatsApp</label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(11) 9 3250-7007"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
            />
            <p className="mt-2 text-xs text-slate-400">Buscamos seu cadastro pelo WhatsApp. Se for seu primeiro pedido, criamos automaticamente.</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={loadingAuth}
            className="mt-2 w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingAuth ? "Entrando..." : "Entrar e ver cardápio"}
          </button>
        </form>
      )}

      {/* Fluxo para cliente novo */}
      {isNewClient && !addressConfirmed && (
        <div className="space-y-6">
          {showLocationPrompt && (
            <div className="text-center space-y-4">
              <p className="text-base font-semibold text-[#264d3d]">Precisamos do seu endereço para entrega.</p>
              <p className="text-xs text-slate-500">Deseja permitir que o app acesse sua localização para preencher automaticamente?</p>
              <div className="flex flex-col gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleLocationPermission}
                  disabled={loadingLocation}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingLocation ? "Buscando localização..." : "Permitir localização"}
                </button>
                <button
                  type="button"
                  onClick={() => { setLocationDenied(true); setShowLocationPrompt(false); }}
                  className="w-full rounded-lg bg-orange-100 px-4 py-3 text-base font-semibold text-[#264d3d] shadow hover:bg-orange-200"
                >
                  Digitar endereço manualmente
                </button>
              </div>
            </div>
          )}

          {(address || locationDenied) && !clientCreated && !reviewStep && (
            <form
              className="space-y-4 mt-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!address || address.trim().length < 8 || !numero.trim()) {
                  setAddressError("Preencha todos os campos obrigatórios.");
                  return;
                }
                setAddressError("");
                // Verifica raio de entrega
                try {
                  const origin = import.meta.env.VITE_DELIVERY_ORIGIN || "Pizzaria Anne & Tom, Alto de Santana, Sao Paulo";
                  const destination = `${address}, ${numero}`;
                  const apiKey = GOOGLE_MAPS_API_KEY;
                  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;
                  const resp = await fetch(url);
                  const data = await resp.json();
                  const km = data?.rows?.[0]?.elements?.[0]?.distance?.value ? data.rows[0].elements[0].distance.value / 1000 : null;
                  if (km == null) {
                    setAddressError("Não foi possível calcular a distância. Tente novamente.");
                    return;
                  }
                  if (km > 15) {
                    setDeliveryCheck({ok: false, km});
                    setAddressError(`Endereço fora do raio de entrega (${km.toFixed(1)}km).`);
                    return;
                  }
                  setDeliveryCheck({ok: true, km});
                  setReviewStep(true);
                } catch {
                  setAddressError("Erro ao verificar entrega. Tente novamente.");
                }
              }}
            >
              <label className="block text-xs font-medium text-slate-700 mb-2">CEP</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={8}
                  pattern="\d{8}"
                  className="w-2/3 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  value={cep}
                  onChange={e => setCep(e.target.value.replace(/\D/g, ""))}
                  placeholder="Digite o CEP"
                  required
                />
                <button
                  type="button"
                  disabled={buscandoCep || cep.length !== 8}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
                  onClick={async () => {
                    setBuscandoCep(true);
                    try {
                      const resp = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                      const json = await resp.json();
                      if (json.erro) {
                        setAddressError("CEP não encontrado.");
                      } else {
                        setAddress(`${json.logradouro || ""}, ${json.bairro || ""} - ${json.localidade || ""}/${json.uf || ""}`.trim());
                        setAddressError("");
                      }
                    } catch {
                      setAddressError("Erro ao buscar CEP.");
                    }
                    setBuscandoCep(false);
                  }}
                >Buscar</button>
              </div>
              <label className="block text-xs font-medium text-slate-700 mb-2">Endereço</label>
              <input
                type="text"
                className={`w-full rounded-lg border ${addressError ? 'border-red-400' : 'border-slate-300'} bg-slate-50 px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500`}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Digite seu endereço completo"
                required
              />
              <label className="block text-xs font-medium text-slate-700 mb-2">Número</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={numero}
                onChange={e => setNumero(e.target.value)}
                placeholder="Número"
                required
              />
              <label className="block text-xs font-medium text-slate-700 mb-2">Complemento (opcional)</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={complemento}
                onChange={e => setComplemento(e.target.value)}
                placeholder="Apartamento, bloco, etc."
              />
              {addressError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{addressError}</div>
              )}
              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow hover:bg-emerald-700"
              >
                Verificar entrega
              </button>
            </form>
          )}

          {/* Mensagem de fora do raio */}
          {deliveryCheck && deliveryCheck.ok === false && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 text-center">
              Endereço fora do raio de entrega ({deliveryCheck.km.toFixed(1)}km). Não é possível realizar pedidos para este endereço.
            </div>
          )}

          {/* Revisão dos dados e captura de nome/CPF */}
          {reviewStep && (
            <form
              className="space-y-4 mt-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!name.trim() || !cpf.trim() || !address || !numero.trim()) {
                  setAddressError("Preencha todos os campos obrigatórios.");
                  return;
                }
                setAddressError("");
                // 3. Cria o cliente
                try {
                  const payload = {
                    source: "website",
                    name: name,
                    cpf: cpf,
                    phone: phone.replace(/\D/g, ""),
                    address: {
                      street: address,
                      cep: cep,
                      number: numero,
                      complement: complemento
                    }
                  };
                  const resp = await fetch("https://api.annetom.com/api/customers", {
                    method: "POST",
                    headers: { 
                      "Content-Type": "application/json",
                      "x-api-key": "change-me-public"},
                    body: JSON.stringify(payload)
                  });
                  if (!resp.ok) {
                    setAddressError("Não foi possível criar seu cadastro. Verifique os dados.");
                    return;
                  }
                  setClientCreated(true);
                } catch {
                  setAddressError("Erro ao criar cadastro. Tente novamente.");
                }
              }}
            >
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <div><strong>Endereço:</strong> {address}, {numero} {complemento ? `- ${complemento}` : ""}</div>
                <div><strong>CEP:</strong> {cep}</div>
                <div><strong>Distância:</strong> {deliveryCheck?.km?.toFixed(1)} km</div>
              </div>
              <label className="block text-xs font-medium text-slate-700 mb-2">Nome completo</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nome completo"
                required
              />
              <label className="block text-xs font-medium text-slate-700 mb-2">CPF</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                value={cpf}
                onChange={e => setCpf(e.target.value.replace(/\D/g, ""))}
                placeholder="CPF"
                maxLength={11}
                required
              />
              {addressError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{addressError}</div>
              )}
              <button
                type="submit"
                className="w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-semibold text-white shadow hover:bg-emerald-700"
              >
                Confirmar cadastro
              </button>
            </form>
          )}
        </div>
      )}

      {/* Após criação do cliente, roda DiscountWheel */}
      {isNewClient && clientCreated && (
        <div className="mt-8 border-t border-slate-100 pt-6">
          <DiscountWheel phone={phoneDigits} onFinished={handleWheelFinished} />
        </div>
      )}

      {lastResult && (
        <p className="mt-4 text-center text-xs text-slate-500">
          Cupom desbloqueado: <span className="font-semibold text-emerald-700">{lastResult.code}</span> ({lastResult.label})
        </p>
      )}
    </div>
  );
};

export default LoginPage;
