import { describe, it } from "node:test";
import assert from "node:assert";
import {
  formatSignedCurrency,
  getDifferenceVisualState,
} from "../inventory-final-report-difference";

describe("inventory-final-report visual helpers", () => {
  it("formata diferença positiva com sinal e rótulo de ganho", () => {
    const value = 6347309.14;
    const formatted = formatSignedCurrency(value);
    const visual = getDifferenceVisualState(value);

    assert.strictEqual(formatted, "+R$ 6.347.309,14");
    assert.strictEqual(visual.label, "Ganho");
    assert.ok(visual.textClassName.includes("text-green-700"));
    assert.ok(visual.badgeClassName.includes("text-green-800"));
  });

  it("formata diferença negativa com sinal e rótulo de perda", () => {
    const value = -63068.63;
    const formatted = formatSignedCurrency(value);
    const visual = getDifferenceVisualState(value);

    assert.strictEqual(formatted, "-R$ 63.068,63");
    assert.strictEqual(visual.label, "Perda");
    assert.ok(visual.textClassName.includes("text-red-700"));
    assert.ok(visual.badgeClassName.includes("text-red-800"));
  });

  it("trata diferença zero com estado neutro", () => {
    const value = 0;
    const formatted = formatSignedCurrency(value);
    const visual = getDifferenceVisualState(value);

    assert.strictEqual(formatted, "R$ 0,00");
    assert.strictEqual(visual.label, "Sem diferença");
    assert.ok(visual.textClassName.includes("text-slate-700"));
  });
});
