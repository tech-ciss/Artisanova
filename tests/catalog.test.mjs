import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSearch } from "../src/lib/catalog/normalize.ts";

test("recherche normalisée : casse, accents, ligatures et espaces", () => {
  assert.equal(normalizeSearch("  CÉRAMIQUE   Cœur  "), "ceramique coeur");
  assert.equal(normalizeSearch("ŒUVRE"), "oeuvre");
  assert.equal(normalizeSearch("Savon\tverveine\n"), "savon verveine");
});

import { parseCatalogParameters, catalogUrl, catalogFiltersSchema } from "../src/lib/validations/catalog.ts";
test("filtres URL validés et montants convertis exactement en centimes", () => {
  const parsed = parseCatalogParameters({ min: "12,30", max: "59.99", q: " bol ", available: "1", page: "2" });
  assert.equal(parsed.success, true);
  assert.equal(parsed.data.min, 1230);
  assert.equal(parsed.data.max, 5999);
  assert.equal(parsed.data.q, "bol");
  const url = catalogUrl(parsed.data);
  assert.deepEqual(parseCatalogParameters(Object.fromEntries(new URL(url, "http://localhost").searchParams)).data, parsed.data);
});
test("filtres malformés, tableaux, dépassements et bornes inversées refusés", () => {
  for (const input of [{ min: "-1" }, { max: "1.001" }, { min: "20", max: "10" }, { q: ["un", "deux"] }, { q: "a".repeat(121) }, { page: "0" }, { page: "10001" }, { sort: "injection" }, { available: "true" }, { max: "99999999" }]) assert.equal(parseCatalogParameters(input).success, false);
  assert.equal(catalogUrl(catalogFiltersSchema.parse({})), "/catalogue");
});
