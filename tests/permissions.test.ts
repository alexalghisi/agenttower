import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { can, retentionStart } from "../lib/permissions";

describe("can", () => {
  it("allows the same rank and anything above it", () => {
    assert.equal(can("admin", "admin"), true);
    assert.equal(can("owner", "admin"), true);
    assert.equal(can("developer", "viewer"), true);
  });

  it("blocks a lower rank", () => {
    assert.equal(can("viewer", "admin"), false);
    assert.equal(can("developer", "admin"), false);
    assert.equal(can("admin", "owner"), false);
  });
});

describe("retentionStart", () => {
  it("walks back the plan window from a fixed clock", () => {
    const now = new Date("2026-01-10T00:00:00.000Z");
    assert.equal(retentionStart("free", now).toISOString(), "2026-01-07T00:00:00.000Z");
    assert.equal(retentionStart("pro", now).toISOString(), "2025-12-11T00:00:00.000Z");
    assert.equal(retentionStart("team", now).toISOString(), "2025-10-12T00:00:00.000Z");
  });
});
