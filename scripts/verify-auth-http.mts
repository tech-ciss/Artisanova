import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "../src/lib/db/client";
import { requireDemoDatabase } from "./demo-database";
import { tokenHash } from "../src/lib/services/persistent-cart.service";
import { throttleKey } from "../src/lib/services/auth.service";
const db = createDatabaseClient(requireDemoDatabase());
const origin = "http://127.0.0.1:3000";
const production = process.env.AUTH_HTTP_PRODUCTION === "true";
const email = `http-auth-${randomUUID()}@example.test`;
const missingEmail = `http-missing-${randomUUID()}@example.test`;
const password = "Http-Auth-42";
const jar = new Map<string, string>();
const guestHashes = new Set<string>();
const decode = (value: string) => value.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
const cookie = () => [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
const clean = (html: string) => html.replaceAll(/<!--[\s\S]*?-->/g, "");
async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(origin + path, { ...init, redirect: "manual", headers: { cookie: cookie(), "user-agent": "facebookexternalhit/1.1", ...init.headers }, signal: AbortSignal.timeout(90000) });
  for (const header of response.headers.getSetCookie()) {
    const [pair] = header.split(";");
    const separator = pair.indexOf("=");
    const name = pair.slice(0, separator), value = pair.slice(separator + 1);
    if (value) {
      assert.match(header, /HttpOnly/i);
      assert.match(header, /SameSite=lax/i);
      if (production) assert.match(header, /Secure/i);
      jar.set(name, value);
      if (name === "artisanova_cart") guestHashes.add(tokenHash(value)!);
    } else jar.delete(name);
  }
  return response;
}
async function html(path: string) {
  const response = await request(path);
  assert.equal(response.status, 200);
  return clean(await response.text());
}
async function submit(path: string, name: string, intent: string, fields: Record<string, string> = {}, requestOrigin = origin) {
  const page = await html(path);
  const form = [...page.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(match => match[1]).find(body => body.includes(`name="${name}" value="${intent}"`));
  assert.ok(form, `Form ${intent} missing`);
  const data = new FormData();
  for (const match of form.matchAll(/<input\b[^>]*>/g)) {
    const inputName = match[0].match(/name="([^"]*)"/)?.[1];
    const value = match[0].match(/value="([^"]*)"/)?.[1] ?? "";
    if (inputName) data.set(decode(inputName), decode(value));
  }
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return request(path, { method: "POST", headers: { origin: requestOrigin }, body: data });
}
try {
  let response = await request("/compte");
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "/connexion");
  assert.doesNotMatch(await response.text(), /passwordHash|admin@artisanova/);
  response = await submit("/inscription", "intent", "signup", { email, password: "weak", confirmation: "weak", firstName: "Test", lastName: "HTTP" });
  assert.equal(response.status, 200);
  let page = clean(await response.text());
  assert.match(page, /aria-invalid="true"/);
  assert.match(page, /Vérifiez les champs signalés/);
  assert.doesNotMatch(page, /value="weak"/);
  assert.equal(await db.user.count({ where: { email } }), 0);
  response = await submit("/inscription", "intent", "signup", { email, password, confirmation: password, firstName: "Test", lastName: "HTTP" }, "https://untrusted.example");
  assert.ok(response.status >= 400);
  assert.equal(await db.user.count({ where: { email } }), 0);
  await submit("/produits/tasse-gres-creme", "operation", "add", { quantity: "1" });
  response = await submit("/inscription", "intent", "signup", { email: email.toUpperCase(), password, confirmation: password, firstName: "Test", lastName: "HTTP", role: "ADMIN" });
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("location"), "/panier?fusion=1");
  assert.ok(jar.get("artisanova_session"));
  assert.equal(jar.has("artisanova_cart"), false);
  const firstToken = jar.get("artisanova_session")!;
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  assert.equal(user.role, "CLIENT");
  response = await request("/compte");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control") ?? "", /no-cache|no-store/);
  assert.doesNotMatch(response.headers.get("cache-control") ?? "", /public|s-maxage=[1-9]/);
  if (production) assert.match(response.headers.get("cache-control") ?? "", /private.*no-store/);
  page = clean(await response.text());
  assert.match(page, /Bonjour Test/);
  assert.doesNotMatch(page, /passwordHash|\$2[aby]\$12\$/);
  assert.match(await html("/panier"), /Mon panier, 1 article/);
  await submit("/produits/tasse-gres-creme", "operation", "add", { quantity: "1", userId: "untrusted-user-id", cartId: "untrusted-cart-id", sessionId: "f".repeat(64) });
  assert.equal((await db.cart.findUniqueOrThrow({ where: { userId: user.id }, include: { items: true } })).items[0].quantity, 2);
  response = await submit("/compte", "intent", "logout");
  assert.equal(response.status, 303);
  assert.equal(jar.has("artisanova_session"), false);
  assert.equal(await db.session.count({ where: { tokenHash: tokenHash(firstToken)! } }), 0);
  assert.match(await html("/panier"), /Votre panier attend/);
  jar.set("artisanova_session", firstToken);
  assert.equal((await request("/compte")).status, 307); // Revoked cookie replay.
  jar.clear();
  for (const candidate of [email, missingEmail]) {
    response = await submit("/connexion", "intent", "login", { email: candidate, password: "Wrong-42" });
    assert.equal(response.status, 200);
    assert.match(clean(await response.text()), /Email ou mot de passe incorrect/);
    assert.equal(jar.has("artisanova_session"), false);
  }
  await submit("/produits/tasse-gres-creme", "operation", "add", { quantity: "1" });
  response = await submit("/connexion", "intent", "login", { email, password });
  assert.equal(response.status, 303);
  assert.match(await html("/panier"), /Mon panier, 3 article/);
  const token = jar.get("artisanova_session")!;
  assert.notEqual(token, firstToken);
  await db.session.update({ where: { tokenHash: tokenHash(token)! }, data: { createdAt: new Date(0), expiresAt: new Date(1000) } });
  assert.equal((await request("/compte")).status, 307);
  assert.match(await html("/panier"), /Votre panier attend/);
  console.log("HTTP auth : accès protégé, inscription, erreurs, session privée, panier compte, fusion, déconnexion, révocation et expiration réussis.");
} finally {
  await db.user.deleteMany({ where: { email } });
  await db.cart.deleteMany({ where: { sessionId: { in: [...guestHashes] } } });
  await db.authThrottle.deleteMany({ where: { key: { in: [throttleKey(email), throttleKey(missingEmail)] } } });
  await db.$disconnect();
}
