import "dotenv/config";
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { compare } from "bcryptjs";
import { createDatabaseClient } from "../src/lib/db/client";
import { requireDemoDatabase } from "../scripts/demo-database";
import type { Prisma } from "../src/generated/prisma/client";

const db = createDatabaseClient(requireDemoDatabase());
after(async () => { await db.$disconnect(); });
const rollback = new Error("intentional-test-rollback");
async function inRollback(check: (tx: Prisma.TransactionClient) => Promise<void>) {
  try {
    await db.$transaction(async tx => { await check(tx); throw rollback; });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

test("seed complet, comptes hashés et commande invitée", async () => {
  const [users, categories, artisans, products, orders, promos] = await Promise.all([
    db.user.findMany({ where: { id: { startsWith: "demo-" } } }),
    db.category.count({ where: { id: { startsWith: "demo-category-" } } }),
    db.artisan.count({ where: { id: { startsWith: "demo-artisan-" } } }),
    db.product.findMany({ where: { id: { startsWith: "demo-product-" } }, include: { images: true } }),
    db.order.findMany({ where: { id: { startsWith: "demo-order-" } }, include: { items: true, addresses: true, history: true } }),
    db.promoCode.count({ where: { id: { startsWith: "demo-promo-" } } }),
  ]);
  assert.equal(users.length, 4);
  assert.equal(users.filter(user => user.role === "ADMIN").length, 1);
  assert.equal(categories, 5);
  assert.equal(artisans, 5);
  assert.equal(products.length, 25);
  assert.equal(promos, 2);
  assert.equal(orders.length, 10);
  assert.ok(orders.some(order => order.userId === null));
  assert.equal(new Set(orders.map(order => order.reference)).size, 10);
  assert.equal(new Set(orders.map(order => order.status)).size, 6);
  for (const user of users) {
    assert.notEqual(user.passwordHash, "Artisanova123!");
    assert.ok(await compare("Artisanova123!", user.passwordHash));
  }
  for (const product of products) assert.ok(product.images.length >= 1 && product.images.length <= 5);
  for (const order of orders) {
    assert.match(order.reference, /^ART-\d{8}-\d{4}$/);
    assert.equal(order.totalCents, order.subtotalCents - order.discountCents + order.shippingCents);
    assert.equal(order.addresses.length, 2);
    assert.ok(order.items.length > 0 && order.history.length > 0);
  }
});

test("stock négatif et prix négatif refusés par PostgreSQL", async () => {
  for (const data of [{ stock: -1 }, { priceCents: -1 }]) {
    await assert.rejects(db.$transaction(tx => tx.product.update({ where: { id: "demo-product-1-1" }, data })), /CHECK|check constraint/i);
  }
});

test("totaux incohérents et idempotence dupliquée refusés", async () => {
  await assert.rejects(db.$transaction(tx => tx.order.update({ where: { id: "demo-order-1" }, data: { totalCents: 1 } })), /CHECK|check constraint/i);
  await assert.rejects(db.$transaction(tx => tx.order.update({ where: { id: "demo-order-2" }, data: { idempotencyKey: "seed-order-1" } })), /Unique constraint/i);
});

test("catégorie utilisée non supprimable et adresse par défaut unique", async () => {
  await assert.rejects(db.$transaction(tx => tx.category.delete({ where: { id: "demo-category-ceramiques" } })), /Foreign key constraint/i);
  await assert.rejects(db.$transaction(async tx => {
    const address = await tx.address.findUniqueOrThrow({ where: { id: "demo-client-1-address" } });
    const { id: originalId, ...copy } = address;
    assert.ok(originalId);
    await tx.address.create({ data: { ...copy, id: `test-${randomUUID()}` } });
  }), /Unique constraint/i);
});

test("une commande conserve son prix et son titre après modification du produit", async () => {
  await inRollback(async tx => {
    const item = await tx.orderItem.findFirstOrThrow({ where: { orderId: "demo-order-1" } });
    await tx.product.update({ where: { id: item.productId! }, data: { title: "Titre temporaire", priceCents: 9999 } });
    const snapshot = await tx.orderItem.findUniqueOrThrow({ where: { id: item.id } });
    assert.equal(snapshot.title, item.title);
    assert.equal(snapshot.unitPriceCents, item.unitPriceCents);
  });
});

test("le dernier exemplaire ne peut être décrémenté que par un acheteur", async () => {
  const id = `test-concurrency-${randomUUID()}`;
  await db.product.create({ data: {
    id, title: "Test concurrence", slug: id, description: "Fixture supprimée après le test", searchText: "test",
    priceCents: 1000, stock: 1, categoryId: "demo-category-ceramiques", artisanId: "demo-artisan-1",
  } });
  try {
    const attempts = await Promise.all([1, 2].map(() => db.$transaction(tx => tx.product.updateMany({
      where: { id, stock: { gte: 1 } }, data: { stock: { decrement: 1 } },
    }))));
    assert.deepEqual(attempts.map(result => result.count).sort(), [0, 1]);
    assert.equal((await db.product.findUniqueOrThrow({ where: { id } })).stock, 0);
  } finally {
    await db.product.delete({ where: { id } });
  }
});

test("panier avec deux propriétaires et promotion supérieure à 100 % refusés", async () => {
  await assert.rejects(db.$transaction(tx => tx.cart.create({ data: { userId: "demo-client-1", sessionId: `test-${randomUUID()}` } })), /CHECK|check constraint/i);
  await assert.rejects(db.$transaction(tx => tx.promoCode.update({ where: { code: "BIENVENUE10" }, data: { value: 101 } })), /CHECK|check constraint/i);
});

test("sixième image et retour de statut refusés", async () => {
  await assert.rejects(db.$transaction(tx => tx.productImage.create({ data: {
    productId: "demo-product-1-1", position: 5, url: "/demo/ceramiques.svg", alt: "Image de test",
  } })), /CHECK|check constraint/i);
  for (const from of [null, "SHIPPED"] as const) {
    await assert.rejects(db.$transaction(tx => tx.orderStatusHistory.create({ data: { orderId: "demo-order-1", from, to: "PAID" } })), /CHECK|check constraint/i);
  }
});


test("relancer le seed ne duplique rien et conserve les données existantes", async () => {
  async function snapshot() {
    return Promise.all([
      db.user.findMany({ where: { id: { startsWith: "demo-" } }, orderBy: { id: "asc" } }),
      db.product.findMany({ where: { id: { startsWith: "demo-product-" } }, orderBy: { id: "asc" }, include: { images: { orderBy: { position: "asc" } } } }),
      db.order.findMany({ where: { id: { startsWith: "demo-order-" } }, orderBy: { id: "asc" } }),
      db.promoCode.findMany({ where: { id: { startsWith: "demo-promo-" } }, orderBy: { id: "asc" } }),
      db.orderSequence.findMany({ orderBy: { day: "asc" } }),
      db.emailLog.count(), db.orderItem.count(), db.orderStatusHistory.count(),
    ]);
  }
  const before = await snapshot();
  await promisify(execFile)(process.execPath, ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"], { timeout: 30000 });
  assert.deepEqual(await snapshot(), before);
});
