import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDays,
  clamp,
  formatCompact,
  formatDuration,
  formatNumber,
  formatUsd,
  parseNumber,
  percentageDelta,
  slugify,
  startOfDay,
} from "../lib/utils";

describe("slugify", () => {
  it("folds punctuation and spaces into a short slug", () => {
    assert.equal(slugify("  Hello, World!  "), "hello-world");
  });

  it("caps the length at 48 characters", () => {
    assert.equal(slugify("a".repeat(80)).length, 48);
  });
});

describe("money and counts", () => {
  it("formats usd and integers for the dashboard", () => {
    assert.equal(formatUsd(1.5), "$1.50");
    assert.equal(formatUsd(29, 0), "$29");
    assert.equal(formatNumber(1200), "1,200");
    assert.equal(formatCompact(1500), "1.5K");
  });
});

describe("formatDuration", () => {
  it("picks ms, seconds, or minutes", () => {
    assert.equal(formatDuration(500), "500ms");
    assert.equal(formatDuration(1500), "1.50s");
    assert.equal(formatDuration(90_000), "1.5m");
  });
});

describe("parseNumber", () => {
  it("accepts numbers and numeric strings", () => {
    assert.equal(parseNumber(4), 4);
    assert.equal(parseNumber("12.5"), 12.5);
  });

  it("treats empty and junk as zero", () => {
    assert.equal(parseNumber(null), 0);
    assert.equal(parseNumber(undefined), 0);
    assert.equal(parseNumber(""), 0);
    assert.equal(parseNumber("nope"), 0);
  });
});

describe("clamp and percentageDelta", () => {
  it("keeps a value inside the range", () => {
    assert.equal(clamp(5, 0, 3), 3);
    assert.equal(clamp(-1, 0, 3), 0);
    assert.equal(clamp(2, 0, 3), 2);
  });

  it("returns a percent change, including a zero baseline", () => {
    assert.equal(percentageDelta(110, 100), 10);
    assert.equal(percentageDelta(0, 0), 0);
    assert.equal(percentageDelta(5, 0), 100);
  });
});

describe("dates", () => {
  it("moves to local midnight without changing the input", () => {
    const date = new Date(2026, 0, 5, 15, 30, 0);
    const start = startOfDay(date);
    assert.equal(start.getFullYear(), 2026);
    assert.equal(start.getMonth(), 0);
    assert.equal(start.getDate(), 5);
    assert.equal(start.getHours(), 0);
    assert.equal(date.getHours(), 15);
  });

  it("adds days on a copy", () => {
    const date = new Date(2026, 0, 5);
    const next = addDays(date, 3);
    assert.equal(next.getDate(), 8);
    assert.equal(date.getDate(), 5);
  });
});
