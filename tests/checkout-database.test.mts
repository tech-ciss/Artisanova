import "dotenv/config";
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { createDatabaseClient } from "../src/lib/db/client";
import { requireDemoDatabase } from "../scripts/demo-database";
import { prepareCheckout, placeOrder, paymentReview, confirmedOrder } from "../src/lib/services/checkout.service";
import { mutateCart, tokenHash } from "../src/lib/services/persistent-cart.service";
import { simulateEmails } from "../src/lib/services/email.service";
const db = createDatabaseClient(requireDemoDatabase());
after(() => db.$disconnect());
const delivery = { email: "guest@example.test", firstName: "Test", lastName: "Guest", line1: "1 rue Fictive", line2: "", city: "Nantes", zip: "44000", country: "FR", shippingMethod: "STANDARD" };
async function fixture(stock = 3, promoLimit?: number) {
  const id = `test-checkout-${randomUUID()}`;
  const product = await db.product.create({ data: { id, slug: id, title: "Produit test commande", description: "Fixture", searchText: "fixture", priceCents: 2400, stock, status: "PUBLISHED", categoryId: "demo-category-ceramiques", artisanId: "demo-artisan-1" } });
  const products = [product];
  const owners = [tokenHash(randomBytes(32).toString("hex"))!, tokenHash(randomBytes(32).toString("hex"))!];
  const code = promoLimit === undefined ? undefined : `TEST-${randomUUID().replaceAll("-", "").toUpperCase()}`;
  if (code) await db.promoCode.create({ data: { code, type: "PERCENT", value: 10, maxUses: promoLimit } });
  return { product, owners, code, async additional() {
    const id = `test-checkout-${randomUUID()}`;
    const alternate = await db.product.create({ data: { ...product, id, slug: id } });
    products.push(alternate);
    return alternate;
  }, async clean() {
    const carts = await db.cart.findMany({ where: { sessionId: { in: owners } }, select: { id: true } });
    const drafts = await db.checkoutDraft.findMany({ where: { cartId: { in: carts.map(cart => cart.id) } } });
    const orderIds = drafts.flatMap(draft => draft.orderId ? [draft.orderId] : []);
    await db.emailLog.deleteMany({ where: { orderId: { in: orderIds } } });
    await db.stockMovement.deleteMany({ where: { orderId: { in: orderIds } } });
    await db.cart.deleteMany({ where: { sessionId: { in: owners } } });
    await db.order.deleteMany({ where: { id: { in: orderIds } } });
    await db.product.deleteMany({ where: { id: { in: products.map(product => product.id) } } });
    if (code) await db.promoCode.delete({ where: { code } });
  } };
}
async function prepare(owner: string, productId: string, code?: string, shippingMethod = "STANDARD") {
  await mutateCart(db, owner, { operation: "add", productId, quantity: 1 });
  if (code) await mutateCart(db, owner, { operation: "promo", code });
  const token = await prepareCheckout(db, owner, { ...delivery, shippingMethod });
  const review = await paymentReview(db, owner, token);
  assert.equal(review.completed, false);
  if (review.completed) throw new Error();
  return { token, payment: { reviewId: review.reviewId, brand: "VISA", number: "4242424242424242", expiry: `12/${new Date().getUTCFullYear() + 2}`, cvc: "123", simulation: "on" } };
}
test("checkout : commande invitée atomique, idempotence, instantanés et email simulé une fois", async () => {
  const f = await fixture(3, 5);
  try {
    const { token, payment } = await prepare(f.owners[0], f.product.id, f.code, "EXPRESS");
    const orders = await Promise.all([1, 2].map(() => placeOrder(db, f.owners[0], token, { ...payment, totalCents: 1, userId: "forged" })));
    assert.equal(orders[0].id, orders[1].id);
    const order = await db.order.findUniqueOrThrow({ where: { id: orders[0].id }, include: { items: true, addresses: true, payments: true, history: true, emails: true, stockMovements: true } });
    assert.match(order.reference, /^ART-\d{8}-\d{4,}$/);
    assert.equal(order.userId, null);
    assert.equal(order.totalCents, 3150);
    assert.equal(order.payments.length, 1);
    assert.equal(order.stockMovements.length, 1);
    assert.equal(order.history.length, 2);
    assert.equal(order.addresses.length, 2);
    assert.equal(order.emails.length, 2);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 2);
    assert.equal((await db.promoCode.findUniqueOrThrow({ where: { code: f.code! } })).usedCount, 1);
    assert.equal(await db.cartItem.count({ where: { cart: { sessionId: f.owners[0] } } }), 0);
    assert.equal(await confirmedOrder(db, order.reference, undefined, undefined), null);
    assert.equal(await confirmedOrder(db, order.reference, "wrong-user", randomBytes(32).toString("hex")), null);
    assert.ok(await confirmedOrder(db, order.reference, undefined, token));
    await db.product.update({ where: { id: f.product.id }, data: { title: "Titre changé", priceCents: 9900 } });
    assert.equal((await db.orderItem.findFirstOrThrow({ where: { orderId: order.id } })).title, "Produit test commande");
    assert.equal(await simulateEmails(db, order.id), 2);
    assert.equal(await simulateEmails(db, order.id), 0);
    assert.ok((await db.emailLog.findMany({ where: { orderId: order.id } })).every(email => email.status === "SIMULATED" && email.attempts === 1));
  } finally { await f.clean(); }
});
test("checkout : deux paniers achètent le dernier exemplaire, une seule transaction réussit", async () => {
  const f = await fixture(1);
  try {
    const drafts = await Promise.all(f.owners.map(owner => prepare(owner, f.product.id)));
    const results = await Promise.allSettled(drafts.map((draft, index) => placeOrder(db, f.owners[index], draft.token, draft.payment)));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal(results.filter(result => result.status === "rejected").length, 1);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 0);
    assert.equal(await db.cartItem.count({ where: { productId: f.product.id } }), 1);
  } finally { await f.clean(); }
});
test("checkout : promotion limitée à une utilisation, rollback du stock et du panier perdant", async () => {
  const f = await fixture(3, 1);
  try {
    const alternate = await f.additional();
    const drafts = await Promise.all(f.owners.map((owner, index) => prepare(owner, index ? alternate.id : f.product.id, f.code)));
    const results = await Promise.allSettled(drafts.map((draft, index) => placeOrder(db, f.owners[index], draft.token, draft.payment)));
    assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
    assert.equal((await db.promoCode.findUniqueOrThrow({ where: { code: f.code! } })).usedCount, 1);
    assert.equal((await db.product.findMany({ where: { id: { in: [f.product.id, alternate.id] } } })).reduce((sum, product) => sum + product.stock, 0), 5);
    assert.equal(await db.cartItem.count({ where: { cart: { sessionId: { in: f.owners } } } }), 1);
  } finally { await f.clean(); }
});
test("checkout : refus fictif, montant modifié, ancien onglet, session étrangère et expiration", async () => {
  const f = await fixture(3);
  try {
    const { token, payment } = await prepare(f.owners[0], f.product.id);
    await assert.rejects(placeOrder(db, f.owners[0], token, { ...payment, number: "4000000000000002" }), /refusé/);
    await assert.rejects(placeOrder(db, f.owners[1], token, payment), /session de commande/);
    await assert.rejects(placeOrder(db, f.owners[0], token, { ...payment, reviewId: "another-tab" }), /autre onglet/);
    await db.product.update({ where: { id: f.product.id }, data: { priceCents: 2600 } });
    await assert.rejects(placeOrder(db, f.owners[0], token, payment), /prix ou le contenu/);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id: f.product.id } })).stock, 3);
    assert.equal(await db.cartItem.count({ where: { productId: f.product.id } }), 1);
    assert.equal(await db.checkoutDraft.count({ where: { tokenHash: tokenHash(token)!, orderId: { not: null } } }), 0);
    await db.checkoutDraft.update({ where: { tokenHash: tokenHash(token)! }, data: { createdAt: new Date(0), expiresAt: new Date(1000) } });
    await assert.rejects(paymentReview(db, f.owners[0], token), /expiré/);
  } finally { await f.clean(); }
});
