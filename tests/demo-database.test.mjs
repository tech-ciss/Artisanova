import { test } from "node:test";
import assert from "node:assert/strict";
import { requireDemoDatabase } from "../scripts/demo-database.ts";

test("seed et tests DB refusent une base distante, la production et un mauvais nom", () => {
  const keys = ["NODE_ENV", "DATABASE_URL", "SEED_DEMO"];
  const original = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  try {
    process.env.NODE_ENV = "development";
    process.env.SEED_DEMO = "true";
    process.env.DATABASE_URL = "postgresql://localhost:5433/artisanova";
    assert.equal(requireDemoDatabase(), process.env.DATABASE_URL);
    for (const address of ["postgresql://example.com/artisanova", "postgresql://localhost/other", "https://localhost/artisanova"]) {
      process.env.DATABASE_URL = address;
      assert.throws(requireDemoDatabase);
    }
    process.env.DATABASE_URL = "postgresql://localhost:5433/artisanova";
    process.env.NODE_ENV = "production";
    assert.throws(requireDemoDatabase);
    process.env.NODE_ENV = "development";
    process.env.SEED_DEMO = "false";
    assert.throws(requireDemoDatabase);
  } finally {
    for (const key of keys) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  }
});
