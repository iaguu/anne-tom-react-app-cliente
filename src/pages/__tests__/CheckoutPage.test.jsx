import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import CheckoutPage from "../CheckoutPage";

const mockUseCheckout = vi.fn();

vi.mock("../../hooks/useCheckout", () => ({
  useCheckout: () => mockUseCheckout(),
}));

const buildCheckoutState = (overrides = {}) => ({
  items: [],
  totalItens: 0,
  passo: 0,
  etapas: ["Carrinho", "Dados", "Revisao", "Pagamento"],
  avancar: vi.fn(),
  voltar: vi.fn(),
  dados: {},
  setDados: vi.fn(),
  tipoCliente: "auto",
  setTipoCliente: vi.fn(),
  clienteExistente: null,
  checandoCliente: false,
  erroClienteApi: "",
  onBuscarClientePorTelefone: vi.fn(),
  buscarCep: vi.fn(),
  buscandoCep: false,
  erroCep: "",
  cupom: "",
  setCupom: vi.fn(),
  aplicarCupom: vi.fn(),
  pagamento: "pix",
  setPagamento: vi.fn(),
  subtotal: 0,
  taxaEntrega: 0,
  desconto: 0,
  totalFinal: 0,
  podeEnviar: false,
  enviando: false,
  deliveryEta: null,
  deliveryEtaLoading: false,
  deliveryEtaError: "",
  distanceKm: null,
  distanceFee: null,
  deliveryFeeLabel: "",
  updateQuantity: vi.fn(),
  removeItem: vi.fn(),
  addItem: vi.fn(),
  enviarPedido: vi.fn(),
  ...overrides,
});

const renderCheckout = () =>
  render(
    <MemoryRouter>
      <CheckoutPage />
    </MemoryRouter>
  );

describe("CheckoutPage", () => {
  it("disables advance when the cart is empty and shows a hint", () => {
    mockUseCheckout.mockReturnValue(buildCheckoutState());

    renderCheckout();

    const advanceButton = screen.getByRole("button", { name: /avan\u00e7ar/i });
    expect(advanceButton).toBeDisabled();
    expect(
      screen.getByText(/adicione itens ao carrinho para continuar/i)
    ).toBeInTheDocument();
  });

  it("shows a retry CTA when enviarPedido fails", async () => {
    const enviarPedido = vi.fn().mockResolvedValue({ success: false });
    mockUseCheckout.mockReturnValue(
      buildCheckoutState({
        passo: 3,
        podeEnviar: true,
        enviarPedido,
      })
    );

    renderCheckout();

    fireEvent.click(screen.getByRole("button", { name: /enviar pedido/i }));

    expect(
      await screen.findByRole("button", { name: /tentar novamente/i })
    ).toBeInTheDocument();
  });
});
