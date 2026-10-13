import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filtersFromSearch } from "../lib/analytics/filters";

const DAY = 24 * 60 * 60 * 1000;

describe("filtersFromSearch", () => {
  it("reads the query the run list puts in the url", () => {
    const filters = filtersFromSearch(
      new URLSearchParams("range=24h&project=p1&environment=production&status=error&q=timeout"),
    );
    assert.equal(filters.preset, "24h");
    assert.equal(filters.projectId, "p1");
    assert.equal(filters.environment, "production");
    assert.equal(filters.status, "error");
    assert.equal(filters.query, "timeout");
    assert.equal(filters.to.getTime() - filters.from.getTime(), DAY);
  });

  it("honors an explicit custom window", () => {
    const filters = filtersFromSearch(
      new URLSearchParams("range=custom&from=2026-01-01T00:00:00.000Z&to=2026-01-02T00:00:00.000Z"),
    );
    assert.equal(filters.preset, "custom");
    assert.equal(filters.from.toISOString(), "2026-01-01T00:00:00.000Z");
    assert.equal(filters.to.toISOString(), "2026-01-02T00:00:00.000Z");
  });

  it("falls back to seven days when custom has no bounds", () => {
    const filters = filtersFromSearch(new URLSearchParams("range=custom"));
    assert.equal(filters.preset, "custom");
    assert.equal(filters.to.getTime() - filters.from.getTime(), 7 * DAY);
    assert.equal(filters.projectId, undefined);
  });
});
