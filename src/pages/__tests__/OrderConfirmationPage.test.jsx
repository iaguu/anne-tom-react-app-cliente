import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { vi } from "vitest";
import OrderConfirmationPage from "../OrderConfirmationPage";

vi.mock("../../api/server", () => ({
  default: {
    fetchStatus: vi.fn(),
    confirmDelivery: vi.fn(),
  },
}));

describe("OrderConfirmationPage", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.pushState({}, "", "/confirmacao");
  });

  it("does not show the confirm delivery button without a trackingId", () => {
    render(
      <MemoryRouter initialEntries={["/confirmacao"]}>
        <OrderConfirmationPage />
      </MemoryRouter>
    );

    expect(
      screen.queryByRole("button", { name: /confirmar entrega/i })
    ).not.toBeInTheDocument();
  });
});
