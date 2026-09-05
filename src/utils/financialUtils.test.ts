import { describe, it, expect } from "vitest";
import { calculateProfitMetrics, formatCurrency, formatPercentage, getProfitLossColor } from "./financialUtils";

describe("calculateProfitMetrics", () => {
  it("computes gross profit and margin from revenue and cost", () => {
    const result = calculateProfitMetrics(1000, 600);
    expect(result.grossProfit).toBe(400);
    expect(result.profitMargin).toBeCloseTo(40, 5);
    expect(result.totalRevenue).toBe(1000);
    expect(result.totalCost).toBe(600);
  });

  it("does not divide by zero when revenue is zero", () => {
    const result = calculateProfitMetrics(0, 0);
    expect(result.profitMargin).toBe(0);
  });

  it("reports a negative gross profit when cost exceeds revenue (a loss-making sale)", () => {
    const result = calculateProfitMetrics(100, 150);
    expect(result.grossProfit).toBe(-50);
    expect(result.profitMargin).toBeCloseTo(-50, 5);
  });

  it("computes revenue growth against a previous period when provided", () => {
    const result = calculateProfitMetrics(1200, 700, 1000);
    expect(result.revenueGrowth).toBeCloseTo(20, 5);
    expect(result.previousPeriodRevenue).toBe(1000);
  });

  it("omits revenue growth when there is no previous period to compare against", () => {
    const result = calculateProfitMetrics(1200, 700);
    expect(result.revenueGrowth).toBeUndefined();
  });

  it("omits revenue growth when the previous period was zero (would divide by zero)", () => {
    const result = calculateProfitMetrics(1200, 700, 0);
    expect(result.revenueGrowth).toBeUndefined();
  });
});

describe("formatCurrency", () => {
  it("formats a positive amount as Naira with two decimal places", () => {
    expect(formatCurrency(1234.5)).toContain("1,234.50");
  });

  it("formats zero without throwing", () => {
    expect(formatCurrency(0)).toContain("0.00");
  });
});

describe("formatPercentage", () => {
  it("formats a whole-number percentage value (already *100) with one decimal place", () => {
    expect(formatPercentage(42.567)).toBe("42.6%");
  });

  it("formats a negative percentage (a loss margin)", () => {
    expect(formatPercentage(-15)).toBe("-15.0%");
  });
});

describe("getProfitLossColor", () => {
  it("uses green for a profit", () => {
    expect(getProfitLossColor(1)).toBe("text-green-600");
  });

  it("uses red for a loss", () => {
    expect(getProfitLossColor(-1)).toBe("text-red-600");
  });

  it("uses neutral gray for exactly break-even", () => {
    expect(getProfitLossColor(0)).toBe("text-gray-600");
  });
});
