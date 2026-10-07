import "dotenv/config";
import assert from "node:assert/strict";
import { createDatabaseClient } from "../src/lib/db/client";
import { requireDemoDatabase } from "./demo-database";
import { tokenHash } from "../src/lib/services/persistent-cart.service";
const db = createDatabaseClient(requireDemoDatabase());
const origin = "http://127.0.0.1:3000";
let cookie = "";
const decode = (value: string) => value.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
async function get(path: string, privateCart = true) {
  const response = await fetch(origin + path, { headers: { cookie: privateCart ? cookie : "", "user-agent": "facebookexternalhit/1.1" } });
  assert.equal(response.status, 200);
  return (await response.text()).replaceAll(/<!--[\s\S]*?-->/g, "");
}
async function submit(path: string, operation: string, fields: Record<string, string>) {
  const html = await get(path);
  const form = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(match => match[1]).find(body => body.includes(`name="operation" value="${operation}"`));
  assert.ok(form, `Form ${operation} missing`);
  const data = new FormData();
  for (const match of form.matchAll(/<input\b[^>]*>/g)) {
    const name = match[0].match(/name="([^"]*)"/)?.[1];
    const value = match[0].match(/value="([^"]*)"/)?.[1] ?? "";
    if (name) data.set(decode(name), decode(value));
  }
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  const response = await fetch(origin + path, { method: "POST", headers: { cookie, origin, "user-agent": "facebookexternalhit/1.1" }, body: data });
  assert.equal(response.status, 200);
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=lax/i);
    cookie = setCookie.split(";")[0];
  }
  return (await response.text()).replaceAll(/<!--[\s\S]*?-->/g, "");
}
try {
  assert.match(await get("/panier"), /Votre panier attend/);
  await submit("/produits/tasse-gres-creme", "add", { quantity: "2" });
  assert.ok(cookie.startsWith("artisanova_cart="));
  let html = await get("/panier");
  assert.match(html, /Mon panier, 2 article/);
  assert.match(html, /48,00/);
  assert.match(await get("/panier", false), /Votre panier attend/);
  assert.match(await submit("/panier", "set", { quantity: "999" }), /Quantité indisponible/);
  assert.match(await submit("/panier", "promo", { code: "UNKNOWN" }), /Code promotionnel inconnu/);
  await submit("/panier", "set", { quantity: "1" });
  assert.match(await get("/panier"), /Mon panier, 1 article/);
  await submit("/panier", "set", { quantity: "2" });
  await submit("/panier", "promo", { code: "BIENVENUE10" });
  html = await get("/panier");
  assert.match(html, /49,10/);
  await submit("/panier", "remove", {});
  assert.match(await get("/panier"), /Votre panier attend/);
  console.log("HTTP panier : ajout, cookie, badge, isolation, stock, promotion, suppression réussis.");
} finally {
  const token = cookie.split("=")[1];
  const sessionId = token ? tokenHash(token) : null;
  if (sessionId) await db.cart.deleteMany({ where: { sessionId } });
  await db.$disconnect();
}
