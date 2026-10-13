import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductGuide } from "../components/product-guide";

describe("ProductGuide first paint", () => {
  it("renders the english guide unlocked", () => {
    const html = renderToStaticMarkup(createElement(ProductGuide));
    assert.match(html, /How to use AgentTower/);
    assert.match(html, /Sign in/);
    assert.match(html, /Send your own run/);
    assert.match(html, /Lock language/);
    assert.match(html, /0\/5/);
    assert.equal(html.includes("disabled"), false);
    assert.equal(html.includes("Cum folosești"), false);
    assert.equal((html.match(/<option /g) || []).length, 6);
  });

  it("uses the same first paint in the header menu", () => {
    const html = renderToStaticMarkup(createElement(ProductGuide, { placement: "menu" }));
    assert.match(html, /<summary/);
    assert.match(html, />Guide</);
    assert.equal(html.includes("disabled"), false);
    assert.equal(html.includes('id="guide"'), false);
  });
});
