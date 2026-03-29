import { describe, it } from "node:test";
import assert from "node:assert";
import { normalizeDashboardSnapshot } from "../InventoryDashboard";
import { mockDashboardData } from "../../../data/mockDashboardData";

describe("InventoryDashboard normalize snapshot", () => {
  it("normaliza campos ausentes sem gerar undefined visível", () => {
    const dirtySnapshot = {
      ...mockDashboardData,
      totals: {
        ...mockDashboardData.totals,
        itemsPlanned: undefined,
        itemsCounted: undefined,
      },
      pendingVsDone: {
        pending: undefined,
        done: undefined,
      },
      divergences: [
        {
          type: "Falta",
          qty: 5,
          valueBRL: 1000,
        } as any,
      ],
      byLocation: [
        {
          locationName: undefined,
          locationCode: undefined,
          itemsCounted: undefined,
          itemsPlanned: undefined,
        } as any,
      ],
      counts: [
        {
          round: 1,
          counted: 10,
        } as any,
      ],
    } as any;

    const normalized = normalizeDashboardSnapshot(dirtySnapshot);

    assert.strictEqual(normalized.safeTotals.itemsPlanned, 0);
    assert.strictEqual(normalized.safeTotals.itemsCounted, 0);
    assert.strictEqual(normalized.safePending, 0);
    assert.strictEqual(normalized.safeDone, 0);
    assert.strictEqual(normalized.safeDivergences[0].count, 5);
    assert.strictEqual(normalized.safeByLocation[0].location, "Local 1");
    assert.strictEqual(normalized.safeByLocation[0].counted, 0);
    assert.strictEqual(normalized.safeCounts[0].items, 10);
  });

  it("calcula distribuição de divergência para gráficos corretamente", () => {
    const snapshot = {
      ...mockDashboardData,
      items: [
        { ...mockDashboardData.items[0], divergence: { ...mockDashboardData.items[0].divergence, quantity: 0 } },
        { ...mockDashboardData.items[1], divergence: { ...mockDashboardData.items[1].divergence, quantity: 1 } },
        { ...mockDashboardData.items[2], divergence: { ...mockDashboardData.items[2].divergence, quantity: 5 } },
      ],
    };

    const normalized = normalizeDashboardSnapshot(snapshot as any);

    assert.strictEqual(normalized.noDivergenceCount, 1);
    assert.strictEqual(normalized.minorDivergenceCount, 1);
    assert.strictEqual(normalized.majorDivergenceCount, 1);
  });
});
