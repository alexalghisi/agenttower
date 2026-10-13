import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateCost, fingerprintError } from "../lib/models/pricing";

function money(value: number): number {
  return Number(value.toFixed(6));
}

describe("estimateCost", () => {
  it("uses the published list rate for a known model", () => {
    assert.equal(money(estimateCost("gpt-4o-mini", 1_000_000, 1_000_000)), 0.75);
    assert.equal(money(estimateCost("claude-sonnet-4", 2_000_000, 0)), 6);
  });

  it("falls back when the model is missing", () => {
    assert.equal(money(estimateCost(undefined, 1_000_000, 0)), 1);
    assert.equal(money(estimateCost("unknown-model", 0, 1_000_000)), 3);
  });
});

describe("fingerprintError", () => {
  it("strips ids and digits so repeats group together", () => {
    const fingerprint = fingerprintError(
      "Timeout 42",
      "request abcdef0123456789 failed at port 443",
    );
    assert.equal(fingerprint, "timeout <n>\nrequest <id> failed at port <n>");
  });

  it("keeps the fingerprint bounded", () => {
    assert.equal(fingerprintError("x".repeat(500), "y".repeat(500)).length, 400);
  });
});
