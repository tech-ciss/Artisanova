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

import { listCatalog, featuredProducts, productBySlug, similarProducts } from "../src/lib/services/catalog.service";
import { catalogFiltersSchema } from "../src/lib/validations/catalog";

test("catalogue : pagination de 12, filtres combinés et recherche avec accents", async () => {
  const page = await listCatalog(db, catalogFiltersSchema.parse({}));
  assert.equal(page.total, 25);
  assert.equal(page.products.length, 12);
  assert.equal(page.pages, 3);
  const second = await listCatalog(db, catalogFiltersSchema.parse({ page: 2 }));
  assert.equal(second.products.length, 12);
  assert.equal(page.products.some(product => second.products.some(other => other.id === product.id)), false);
  assert.equal((await listCatalog(db, catalogFiltersSchema.parse({ page: 1000 }))).page, 3);
  const filtered = await listCatalog(db, catalogFiltersSchema.parse({ q: "GRÈS", category: "ceramiques", min: 2500, max: 6000, available: true }));
  assert.deepEqual(filtered.products.map(product => product.slug), ["pichet-gres"]);
  const allStock = await listCatalog(db, catalogFiltersSchema.parse({ available: true }));
  assert.equal(allStock.total, 24);
  for (const query of ["%", "_", "' OR 1=1 --"]) assert.equal((await listCatalog(db, catalogFiltersSchema.parse({ q: query }))).total, 0);
});

test("catalogue : tris par prix et popularité réelle des commandes payées", async () => {
  const ascending = await listCatalog(db, catalogFiltersSchema.parse({ sort: "price-asc" }));
  assert.equal(ascending.products[0].priceCents, 700);
  assert.ok(ascending.products.every((entry, index) => index === 0 || entry.priceCents >= ascending.products[index - 1].priceCents));
  const descending = await listCatalog(db, catalogFiltersSchema.parse({ sort: "price-desc" }));
  assert.equal(descending.products[0].priceCents, 5900);
  const popular = await listCatalog(db, catalogFiltersSchema.parse({ sort: "popular" }));
  const bought = await db.orderItem.groupBy({ by: ["productId"], where: { order: { status: { in: ["PAID", "PREPARING", "SHIPPED", "DELIVERED"] } } }, _sum: { quantity: true } });
  const quantities = new Map(bought.map(entry => [entry.productId, entry._sum.quantity ?? 0]));
  assert.ok(popular.products.every((entry, index) => index === 0 || (quantities.get(entry.id) ?? 0) <= (quantities.get(popular.products[index - 1].id) ?? 0)));
});

test("catalogue : brouillons et catégories archivées invisibles sur toutes les entrées", async () => {
  const categoryId = `test-archive-${randomUUID()}`;
  const draftId = `test-draft-${randomUUID()}`;
  const archivedId = `test-hidden-${randomUUID()}`;
  await db.category.create({ data: { id: categoryId, slug: categoryId, name: "Test archive", isArchived: true } });
  try {
    await db.product.createMany({ data: [
      { id: draftId, slug: draftId, title: "Hidden fixture", description: "Test", searchText: "hiddenfixture", priceCents: 1000, stock: 999, isFeatured: true, status: "DRAFT", categoryId: "demo-category-ceramiques", artisanId: "demo-artisan-1" },
      { id: archivedId, slug: archivedId, title: "Hidden fixture", description: "Test", searchText: "hiddenfixture", priceCents: 1000, stock: 999, isFeatured: true, status: "PUBLISHED", categoryId, artisanId: "demo-artisan-1" },
    ] });
    assert.equal((await listCatalog(db, catalogFiltersSchema.parse({ q: "hiddenfixture" }))).total, 0);
    assert.equal(await productBySlug(db, draftId), null);
    assert.equal(await productBySlug(db, archivedId), null);
    assert.ok((await featuredProducts(db)).every(entry => entry.id !== draftId && entry.id !== archivedId));
    assert.ok((await similarProducts(db, "demo-product-1-1", "demo-category-ceramiques")).every(entry => entry.id !== draftId));
  } finally {
    await db.product.deleteMany({ where: { id: { in: [draftId, archivedId] } } });
    await db.category.delete({ where: { id: categoryId } });
  }
  const product = await productBySlug(db, "tasse-gres-creme");
  assert.ok(product);
  assert.equal(await productBySlug(db, "inexistant"), null);
  assert.equal(await productBySlug(db, "' OR 1=1"), null);
  const related = await similarProducts(db, product.id, product.categoryId);
  assert.equal(related.length, 4);
  assert.ok(related.every(entry => entry.id !== product.id && entry.category.id === product.categoryId));
  assert.equal((await featuredProducts(db)).length, 5);
});

test("panier : persistance, isolation, stock, promo et ajouts concurrents", async () => {
  const { mutateCart, readCart, tokenHash, CartError } = await import("../src/lib/services/persistent-cart.service");
  const sessionId = `test-cart-${randomUUID()}`;
  const other = `test-cart-${randomUUID()}`;
  try {
    assert.equal(tokenHash("arbitrary-cart-id"), null);
    assert.equal(tokenHash("a".repeat(64))?.length, 64);
    const productId = "demo-product-1-1";
    await Promise.all([1, 2].map(() => mutateCart(db, sessionId, { operation: "add", productId, quantity: 1 })));
    let cart = await readCart(db, sessionId);
    assert.equal(cart.count, 2);
    assert.equal(cart.totals.subtotalCents, 4800);
    assert.equal((await readCart(db, other)).count, 0);
    await assert.rejects(mutateCart(db, sessionId, { operation: "set", productId, quantity: 999 }), CartError);
    await assert.rejects(mutateCart(db, sessionId, { operation: "add", productId: "demo-product-3-5", quantity: 1 }), CartError);
    await assert.rejects(mutateCart(db, sessionId, { operation: "promo", code: "UNKNOWN" }), CartError);
    await mutateCart(db, sessionId, { operation: "promo", code: " bienvenue10 " });
    cart = await readCart(db, sessionId);
    assert.equal(cart.totals.discountCents, 480);
    assert.equal(cart.totals.totalCents, 4910);
    await mutateCart(db, sessionId, { operation: "set", productId, quantity: 1 });
    assert.equal((await readCart(db, sessionId)).count, 1);
    await mutateCart(db, sessionId, { operation: "remove", productId });
    assert.equal((await readCart(db, sessionId)).totals.totalCents, 0);
  } finally { await db.cart.deleteMany({ where: { sessionId: { in: [sessionId, other] } } }); }
});

test("panier : prix actualisé, rupture et promotion expirée signalés", async () => {
  const { readCart } = await import("../src/lib/services/persistent-cart.service");
  await inRollback(async tx => {
    const sessionId = `test-cart-${randomUUID()}`;
    const cart = await tx.cart.create({ data: { sessionId, promoCode: "BIENVENUE10", items: { create: { productId: "demo-product-1-1", quantity: 1 } } } });
    await tx.product.update({ where: { id: "demo-product-1-1" }, data: { priceCents: 2700 } });
    assert.equal((await readCart(tx, sessionId)).totals.subtotalCents, 2700);
    await tx.promoCode.update({ where: { code: "BIENVENUE10" }, data: { expiresAt: new Date(0) } });
    let view = await readCart(tx, sessionId);
    assert.ok(view.promotionError);
    assert.equal(view.totals.discountCents, 0);
    await tx.product.update({ where: { id: "demo-product-1-1" }, data: { stock: 0 } });
    view = await readCart(tx, sessionId);
    assert.equal(view.items[0].available, false);
    assert.equal(view.totals.totalCents, 0);
    assert.equal(await tx.cartItem.count({ where: { cartId: cart.id } }), 1);
  });
});
