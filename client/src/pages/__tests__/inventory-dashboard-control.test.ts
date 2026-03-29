import { describe, it } from "node:test";
import assert from "node:assert";
import {
  applyDashboardControlAction,
  getInventoryLifecycleLabel,
  isClosedInventoryStatus,
  validateManualRefresh,
} from "../inventory-dashboard-control";

describe("inventory-dashboard-control unit", () => {
  it("classifica status fechados corretamente", () => {
    assert.strictEqual(isClosedInventoryStatus("closed"), true);
    assert.strictEqual(isClosedInventoryStatus("count1_closed"), true);
    assert.strictEqual(isClosedInventoryStatus("count2_completed"), true);
    assert.strictEqual(isClosedInventoryStatus("cancelled"), true);
  });

  it("classifica status em andamento corretamente", () => {
    assert.strictEqual(isClosedInventoryStatus("open"), false);
    assert.strictEqual(isClosedInventoryStatus("count1_open"), false);
    assert.strictEqual(isClosedInventoryStatus("planning"), false);
    assert.strictEqual(isClosedInventoryStatus(undefined), false);
  });

  it("retorna label visual de ciclo de vida", () => {
    assert.strictEqual(getInventoryLifecycleLabel("closed"), "Fechado");
    assert.strictEqual(getInventoryLifecycleLabel("count3_open"), "Em Andamento");
  });

  it("bloqueia atualização manual quando necessário", () => {
    assert.deepStrictEqual(
      validateManualRefresh({
        demoMode: true,
        hasSelectedInventory: true,
        inventoryStatus: "open",
      }),
      { allowed: false, reason: "demo_mode" },
    );

    assert.deepStrictEqual(
      validateManualRefresh({
        demoMode: false,
        hasSelectedInventory: false,
        inventoryStatus: "open",
      }),
      { allowed: false, reason: "missing_inventory" },
    );

    assert.deepStrictEqual(
      validateManualRefresh({
        demoMode: false,
        hasSelectedInventory: true,
        inventoryStatus: "closed",
      }),
      { allowed: false, reason: "inventory_closed" },
    );
  });
});

describe("inventory-dashboard-control integração de fluxo", () => {
  it("desabilita auto refresh ao selecionar inventário fechado", () => {
    const initialState = {
      autoRefresh: true,
      demoMode: false,
      inventoryStatus: "open",
      hasSelectedInventory: true,
    };

    const nextState = applyDashboardControlAction(initialState, {
      type: "select_inventory",
      inventoryStatus: "closed",
      hasSelectedInventory: true,
    });

    assert.strictEqual(nextState.autoRefresh, false);
    assert.strictEqual(nextState.inventoryStatus, "closed");
  });

  it("mantém auto refresh para inventário em andamento", () => {
    const initialState = {
      autoRefresh: true,
      demoMode: false,
      inventoryStatus: "open",
      hasSelectedInventory: true,
    };

    const nextState = applyDashboardControlAction(initialState, {
      type: "select_inventory",
      inventoryStatus: "count2_open",
      hasSelectedInventory: true,
    });

    assert.strictEqual(nextState.autoRefresh, true);
    assert.strictEqual(nextState.inventoryStatus, "count2_open");
  });

  it("impede religar auto refresh em inventário fechado", () => {
    const initialState = {
      autoRefresh: false,
      demoMode: false,
      inventoryStatus: "closed",
      hasSelectedInventory: true,
    };

    const nextState = applyDashboardControlAction(initialState, {
      type: "toggle_auto_refresh",
      value: true,
    });

    assert.strictEqual(nextState.autoRefresh, false);
  });
});
