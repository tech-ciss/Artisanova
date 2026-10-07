import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "../src/lib/db/client";
import { requireDemoDatabase } from "./demo-database";
import { tokenHash } from "../src/lib/services/persistent-cart.service";
import { throttleKey } from "../src/lib/services/auth.service";
const db = createDatabaseClient(requireDemoDatabase());
const origin = process.env.HTTP_TEST_ORIGIN ?? "http://127.0.0.1:3000";
assert.ok(["http://127.0.0.1:3000", "http://127.0.0.1:3001"].includes(origin));
const id = `test-http-checkout-${randomUUID()}`, email = `${id}@example.test`, wrongEmail = `wrong-${id}@example.test`, foreignEmail = `foreign-${id}@example.test`;
const promo = `HTTP-${randomUUID().replaceAll("-", "").toUpperCase()}`;
const jar = new Map<string, string>(), guestHashes = new Set<string>();
const decode = (value: string) => value.replaceAll("&quot;", '"').replaceAll("&amp;", "&").replaceAll("&#x27;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">");
const clean = (html: string) => html.replaceAll(/<!--[\s\S]*?-->/g, "");
async function request(path: string, init: RequestInit = {}, privateSession = true) {
  const response = await fetch(origin + path, { ...init, redirect: "manual", headers: { cookie: privateSession ? [...jar].map(([name, value]) => `${name}=${value}`).join("; ") : "", "user-agent": "facebookexternalhit/1.1", ...init.headers }, signal: AbortSignal.timeout(90000) });
  if (privateSession) for (const header of response.headers.getSetCookie()) {
    const [pair] = header.split(";");
    const separator = pair.indexOf("="), name = pair.slice(0, separator), value = pair.slice(separator + 1);
    if (value) {
      assert.match(header, /HttpOnly/i); assert.match(header, /SameSite=lax/i);
      jar.set(name, value);
      if (name === "artisanova_cart") guestHashes.add(tokenHash(value)!);
    } else jar.delete(name);
  }
  return response;
}
async function page(path: string) { const response = await request(path); assert.equal(response.status, 200); return clean(await response.text()); }
async function form(path: string, name: string, intent: string) {
  const html = await page(path);
  const body = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/g)].map(match => match[1]).find(body => body.includes(`name="${name}" value="${intent}"`));
  assert.ok(body, `Form ${intent} missing`);
  const data = new FormData();
  for (const input of body.matchAll(/<input\b[^>]*>/g)) {
    const name = input[0].match(/name="([^"]*)"/)?.[1], value = input[0].match(/value="([^"]*)"/)?.[1] ?? "";
    if (name) data.set(decode(name), decode(value));
  }
  return data;
}
function post(path: string, data: FormData, fields: Record<string, string>, requestOrigin = origin) {
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return request(path, { method: "POST", headers: { origin: requestOrigin }, body: data });
}
const delivery = { email, firstName: "Test", lastName: "Invité", line1: "1 rue Fictive", line2: "", city: "Nantes", zip: "44000", country: "FR", shippingMethod: "RELAY", relayPoint: "PARIS" };
const payment = { brand: "VISA", number: "4242424242424242", expiry: `12/${new Date().getUTCFullYear() + 2}`, cvc: "123", simulation: "on" };
try {
  const source = await db.product.findUniqueOrThrow({ where: { id: "demo-product-1-1" } });
  await db.product.create({ data: { ...source, id, slug: id, title: "Création de test checkout", priceCents: 2400, stock: 4, isFeatured: false, images: { create: { url: "/demo/ceramiques.svg", alt: "Illustration fictive", position: 0 } } } });
  await db.promoCode.create({ data: { code: promo, type: "PERCENT", value: 10, maxUses: 5 } });
  assert.match(await page("/commande/livraison"), /Votre panier est vide/);
  let response = await post(`/produits/${id}`, await form(`/produits/${id}`, "operation", "add"), { quantity: "1" });
  assert.equal(response.status, 200);
  await post("/panier", await form("/panier", "operation", "promo"), { code: promo });
  response = await post("/commande/livraison", await form("/commande/livraison", "intent", "delivery"), { ...delivery, zip: "wrong" });
  assert.equal(response.status, 200); assert.match(clean(await response.text()), /code postal français/);
  response = await post("/commande/livraison", await form("/commande/livraison", "intent", "delivery"), delivery);
  if (response.status !== 303) console.error("Livraison :", clean(await response.text()).match(/role="alert"[^>]*>([\s\S]*?)<\/p>/)?.[1]);
  assert.equal(response.status, 303); assert.equal(response.headers.get("location"), "/commande/paiement");
  assert.ok(jar.get("artisanova_checkout"));
  let review = await page("/commande/paiement");
  assert.match(review, /26,50/); assert.match(review, /75001 Paris/); assert.match(review, /44000 Nantes/);
  response = await post("/commande/paiement", await form("/commande/paiement", "intent", "payment"), { ...payment, number: "4000000000000002" });
  assert.equal(response.status, 200); assert.match(clean(await response.text()), /Paiement fictif refusé/);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id } })).stock, 4);
  const oldForm = await form("/commande/paiement", "intent", "payment");
  await post("/commande/livraison", await form("/commande/livraison", "intent", "delivery"), delivery);
  response = await post("/commande/paiement", oldForm, payment);
  assert.match(clean(await response.text()), /autre onglet/);
  const payForm = await form("/commande/paiement", "intent", "payment");
  response = await post("/commande/paiement", payForm, payment, "https://untrusted.example");
  assert.ok(response.status >= 400);
  assert.equal(await db.order.count({ where: { items: { some: { productId: id } } } }), 0);
  response = await post("/commande/paiement", payForm, { ...payment, totalCents: "1", userId: "forged" });
  assert.equal(response.status, 303);
  const confirmation = response.headers.get("location")!;
  assert.match(confirmation, /^\/commande\/confirmation\/ART-\d{8}-\d{4,}$/);
  assert.ok(jar.get("artisanova_receipt"));
  assert.match(await page(confirmation), /Merci pour votre commande/);
  const order = await db.order.findFirstOrThrow({ where: { items: { some: { productId: id } } }, include: { addresses: true, emails: true, payments: true } });
  assert.equal(order.userId, null); assert.equal(order.totalCents, 2650);
  assert.equal(order.addresses.find(address => address.type === "SHIPPING")?.city, "Paris");
  assert.equal(order.addresses.find(address => address.type === "BILLING")?.city, "Nantes");
  assert.ok(order.emails.every(email => email.status === "SIMULATED"));
  assert.equal(order.payments.length, 1);
  assert.doesNotMatch(JSON.stringify(order), /4242424242424242|4000000000000002/);
  response = await post("/commande/paiement", payForm, payment); assert.equal(response.status, 303);
  assert.equal(await db.order.count({ where: { items: { some: { productId: id } } } }), 1);
  assert.equal((await db.product.findUniqueOrThrow({ where: { id } })).stock, 3);
  for (const agent of ["facebookexternalhit/1.1", "Mozilla/5.0"]) {
    response = await request(confirmation, { headers: { "user-agent": agent } }, false);
    assert.equal(response.status, 404); assert.doesNotMatch(await response.text(), new RegExp(email));
  }
  const password = "Checkout-Test-42";
  response = await post("/inscription?commande=1", await form("/inscription?commande=1", "intent", "signup"), { email: wrongEmail, password, confirmation: password, firstName: "Test", lastName: "Compte" });
  assert.equal(response.status, 200); assert.match(clean(await response.text()), /Pour rattacher la commande/);
  assert.equal(await db.user.count({ where: { email: wrongEmail } }), 0);
  response = await post("/inscription?commande=1", await form("/inscription?commande=1", "intent", "signup"), { email, password, confirmation: password, firstName: "Test", lastName: "Compte" });
  assert.equal(response.status, 303); assert.equal(response.headers.get("location"), confirmation);
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  assert.equal((await db.order.findUniqueOrThrow({ where: { id: order.id } })).userId, user.id);
  const address = await db.address.create({ data: { userId: user.id, firstName: "Nom enregistré", lastName: "Compte", line1: "4 rue Fictive", city: "Nantes", zip: "44000", country: "FR", type: "SHIPPING", isDefault: true } });
  const foreign = await db.user.create({ data: { email: foreignEmail, firstName: "Autre", lastName: "Compte", passwordHash: user.passwordHash } });
  const foreignAddress = await db.address.create({ data: { userId: foreign.id, firstName: "Autre", lastName: "Compte", line1: "Adresse secrète de test", city: "Paris", zip: "75001", country: "FR", type: "SHIPPING" } });
  await post(`/produits/${id}`, await form(`/produits/${id}`, "operation", "add"), { quantity: "1" });
  assert.match(await page("/commande/livraison"), /4 rue Fictive/);
  response = await post("/commande/livraison", await form("/commande/livraison", "intent", "delivery"), { ...delivery, addressId: foreignAddress.id });
  assert.equal(response.status, 200); review = clean(await response.text());
  assert.match(review, /adresse n’est pas disponible/); assert.doesNotMatch(review, /Adresse secrète/);
  response = await post("/commande/livraison", await form("/commande/livraison", "intent", "delivery"), { ...delivery, email: "forged@example.test", addressId: address.id, firstName: "forged", shippingMethod: "EXPRESS" });
  assert.equal(response.status, 303);
  response = await post("/commande/paiement", await form("/commande/paiement", "intent", "payment"), { ...payment, brand: "MASTERCARD", number: "5555555555554444" });
  assert.equal(response.status, 303);
  const connectedOrder = await db.order.findFirstOrThrow({ where: { userId: user.id, id: { not: order.id } }, include: { addresses: true } });
  assert.equal(connectedOrder.email, email); assert.equal(connectedOrder.totalCents, 3390);
  assert.equal(connectedOrder.addresses.find(address => address.type === "SHIPPING")?.firstName, "Nom enregistré");
  console.log("HTTP checkout : invité, relais/facturation, refus, origine, ancien onglet, paiement idempotent, confirmation privée, compte facultatif et adresse propriétaire validés.");
} finally {
  const orders = await db.order.findMany({ where: { items: { some: { productId: id } } }, select: { id: true } });
  const orderIds = orders.map(order => order.id);
  await db.emailLog.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.stockMovement.deleteMany({ where: { orderId: { in: orderIds } } });
  await db.order.deleteMany({ where: { id: { in: orderIds } } });
  await db.user.deleteMany({ where: { email: { in: [email, wrongEmail, foreignEmail] } } });
  await db.cart.deleteMany({ where: { sessionId: { in: [...guestHashes] } } });
  await db.product.deleteMany({ where: { id } });
  await db.promoCode.deleteMany({ where: { code: promo } });
  await db.authThrottle.deleteMany({ where: { key: { in: [throttleKey(email), throttleKey(wrongEmail)] } } });
  await db.$disconnect();
}
