import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSearch } from "../src/lib/catalog/normalize.ts";

test("recherche normalisée : casse, accents, ligatures et espaces", () => {
  assert.equal(normalizeSearch("  CÉRAMIQUE   Cœur  "), "ceramique coeur");
  assert.equal(normalizeSearch("ŒUVRE"), "oeuvre");
  assert.equal(normalizeSearch("Savon\tverveine\n"), "savon verveine");
});
