import { renderHook, act } from "@testing-library/react";
import { vi } from "vitest";
import { useCheckout } from "../useCheckout";

const cartMocks = vi.hoisted(() => ({
  clearCart: vi.fn(),
}));

const serverMocks = vi.hoisted(() => ({
  enviarParaDesktop: vi.fn(),
  checkCustomerByPhone: vi.fn(),
  salvarCliente: vi.fn(),
}));

vi.mock("../../context/CartContext", () => ({
  useCart: () => ({
    items: [
      {
        id: "pizza-1",
        idPizza: 1,
        nome: "Pizza Teste",
        tamanho: "grande",
        quantidade: 1,
        precoUnitario: 10,
      },
    ],
    total: 10,
    updateQuantity: vi.fn(),
    removeItem: vi.fn(),
    clearCart: cartMocks.clearCart,
    addItem: vi.fn(),
  }),
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ customer: null }),
}));

vi.mock("../../api/server", () => ({
  default: {
    enviarParaDesktop: serverMocks.enviarParaDesktop,
    checkCustomerByPhone: serverMocks.checkCustomerByPhone,
    salvarCliente: serverMocks.salvarCliente,
  },
}));

describe("useCheckout", () => {
  beforeEach(() => {
    cartMocks.clearCart.mockReset();
    serverMocks.enviarParaDesktop.mockReset();
    serverMocks.checkCustomerByPhone.mockReset();
    serverMocks.salvarCliente.mockReset();
  });

  it("does not clear the cart when enviarParaDesktop fails", async () => {
    serverMocks.enviarParaDesktop.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "error",
      json: async () => ({}),
    });

    const { result } = renderHook(() => useCheckout());

    act(() => {
      result.current.setDados((prev) => ({
        ...prev,
        nome: "Teste",
        telefone: "11999999999",
        retirada: true,
        customerId: "c1",
      }));
    });

    await act(async () => {
      await result.current.enviarPedido();
    });

    expect(cartMocks.clearCart).not.toHaveBeenCalled();
  });
});
