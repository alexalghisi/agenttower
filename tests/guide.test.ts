import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyLocaleChange,
  GUIDE_GOAL_IDS,
  guideFor,
  isLocale,
  LOCALES,
  parseDone,
  resolveLocale,
  serializeDone,
  toggleDone,
} from "../lib/guide/catalog";

describe("locales", () => {
  it("falls back to english for an unknown value", () => {
    assert.equal(isLocale("fr"), true);
    assert.equal(isLocale("en-US"), false);
    assert.equal(isLocale(null), false);
    assert.equal(resolveLocale(undefined), "en");
    assert.equal(resolveLocale("zz"), "en");
    assert.equal(resolveLocale("it"), "it");
  });

  it("keeps the current language while locked", () => {
    assert.equal(applyLocaleChange("ro", "de", true), "ro");
    assert.equal(applyLocaleChange("ro", "de", false), "de");
    assert.equal(applyLocaleChange("ro", "nope", false), "en");
  });
});

describe("guide copy", () => {
  it("gives every language the same goals and filled sentences", () => {
    for (const locale of LOCALES) {
      const copy = guideFor(locale);
      assert.deepEqual(
        copy.goals.map((goal) => goal.id),
        GUIDE_GOAL_IDS,
      );
      assert.ok(copy.title.length > 0);
      assert.ok(copy.summary.length > 0);
      assert.ok(copy.menuLabel.length > 0);
      assert.ok(copy.lock.length > 0);
      assert.ok(copy.unlock.length > 0);
      for (const goal of copy.goals) {
        assert.ok(goal.title.length > 0);
        assert.ok(goal.detail.length > 0);
      }
      assert.match(copy.goals[0].detail, /demo@agenttower\.dev/);
      assert.match(copy.goals[2].detail, /Runs/);
      assert.match(copy.goals[3].detail, /Costs/);
      assert.match(copy.goals[4].detail, /\/api\/v1\/runs/);
    }
  });
});

describe("goal progress", () => {
  it("drops unknown ids and duplicates", () => {
    assert.deepEqual(parseDone("sign-in, nope, trace, sign-in", GUIDE_GOAL_IDS), ["sign-in", "trace"]);
    assert.deepEqual(parseDone(null, GUIDE_GOAL_IDS), []);
    assert.deepEqual(parseDone("", GUIDE_GOAL_IDS), []);
  });

  it("toggles a goal without touching the others", () => {
    assert.deepEqual(toggleDone(["sign-in"], "trace"), ["sign-in", "trace"]);
    assert.deepEqual(toggleDone(["sign-in", "trace"], "sign-in"), ["trace"]);
    assert.equal(serializeDone(["sign-in", "trace"]), "sign-in,trace");
  });
});
