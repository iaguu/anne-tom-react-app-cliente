import { describe, expect, it } from "vitest";
import { getFeeByDistance, getTaxaPorBairro, parseDistanceKm } from "../deliveryFees";

describe("deliveryFees utils", () => {
  it("calcula taxa por faixa de distancia", () => {
    expect(getFeeByDistance(0.5)).toBe(3.5);
    expect(getFeeByDistance(1.2)).toBe(5.9);
    expect(getFeeByDistance(3)).toBe(8.9);
  });

  it("retorna null quando distancia eh invalida", () => {
    expect(getFeeByDistance(null)).toBeNull();
    expect(getFeeByDistance(Number.NaN)).toBeNull();
  });

  it("interpreta distancia em km e metros", () => {
    expect(parseDistanceKm("2,5 km")).toBeCloseTo(2.5);
    expect(parseDistanceKm("750 m")).toBeCloseTo(0.75);
    expect(parseDistanceKm("")).toBeNull();
  });

  it("retorna taxa por bairro com fallback", () => {
    expect(getTaxaPorBairro("Santana")).toBe(6);
    expect(getTaxaPorBairro("Bairro desconhecido")).toBe(10);
  });
});
