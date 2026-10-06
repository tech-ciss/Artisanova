import "dotenv/config";
import { requireDemoDatabase } from "../scripts/demo-database";
import { hash } from "bcryptjs";
import { createDatabaseClient } from "../src/lib/db/client";
import { normalizeSearch } from "../src/lib/catalog/normalize";
import { calculateCart } from "../src/lib/services/cart.service";
import { demoAccounts, demoArtisans, demoCategories, demoProducts } from "./seed-data";
import type { OrderStatus } from "../src/generated/prisma/client";

const connectionString = requireDemoDatabase();
const db = createDatabaseClient(connectionString);
const accountHashes = await Promise.all(demoAccounts.map(() => hash("Artisanova123!", 12)));

try {
  await db.$transaction(async (tx) => {
    for (const [index, account] of demoAccounts.entries()) {
      await tx.user.upsert({ where: { id: account.id }, update: {}, create: { ...account, passwordHash: accountHashes[index] } });
    }
    for (const account of demoAccounts.slice(1)) {
      await tx.address.upsert({ where: { id: `${account.id}-address` }, update: {}, create: {
        id: `${account.id}-address`, userId: account.id, firstName: account.firstName, lastName: account.lastName,
        line1: "1 rue de Démonstration", city: "Nantes", zip: "44000", country: "FR", type: "SHIPPING", isDefault: true,
      } });
    }
    for (const category of demoCategories) await tx.category.upsert({ where: { id: category.id }, update: {}, create: category });
    for (const artisan of demoArtisans) await tx.artisan.upsert({ where: { id: artisan.id }, update: {}, create: artisan });
    for (const [index, entry] of demoProducts.entries()) {
      const { image, ...product } = entry;
      await tx.product.upsert({ where: { id: product.id }, update: {}, create: {
        ...product, status: "PUBLISHED", vatBasisPoints: 2000,
        searchText: normalizeSearch(`${product.title} ${product.description} ${demoCategories[Math.floor(index / 5)].name}`),
        createdAt: new Date(Date.UTC(2026, 8, 1 + index)),
        images: { create: { id: `${product.id}-image`, url: image, alt: `${product.title} — illustration de démonstration`, position: 0 } },
      } });
    }
    await tx.promoCode.upsert({ where: { code: "BIENVENUE10" }, update: {}, create: { id: "demo-promo-welcome", code: "BIENVENUE10", type: "PERCENT", value: 10, maxUses: 1000 } });
    await tx.promoCode.upsert({ where: { code: "PORT0" }, update: {}, create: { id: "demo-promo-shipping", code: "PORT0", type: "FREE_SHIPPING", value: 0 } });

    const paths: OrderStatus[][] = [
      ["PENDING_PAYMENT"], ["PENDING_PAYMENT", "PAID"], ["PENDING_PAYMENT", "PAID", "PREPARING"],
      ["PENDING_PAYMENT", "PAID", "PREPARING", "SHIPPED"], ["PENDING_PAYMENT", "PAID", "PREPARING", "SHIPPED", "DELIVERED"],
      ["PENDING_PAYMENT", "CANCELLED"],
    ];
    for (let index = 0; index < 10; index++) {
      const product = demoProducts.filter(entry => entry.stock > 0)[index * 2];
      const account = demoAccounts[1 + index % 3];
      const guest = index === 9;
      const totals = calculateCart([{ productId: product.id, unitPriceCents: product.priceCents, quantity: 1 + index % 2, stock: product.stock }]);
      const path = paths[index % paths.length];
      const status = path[path.length - 1];
      const createdAt = new Date(Date.UTC(2026, 9, 1 + index % 5, 10, index));
      const day = createdAt.toISOString().slice(0, 10).replaceAll("-", "");
      const reference = `ART-${day}-${String(index + 1).padStart(4, "0")}`;
      const orderId = `demo-order-${index + 1}`;
      const succeeded = path.includes("PAID");
      await tx.order.upsert({ where: { id: orderId }, update: {}, create: {
        id: orderId, reference, idempotencyKey: `seed-order-${index + 1}`, userId: guest ? null : account.id,
        email: guest ? "invite@artisanova.test" : account.email, status, shippingMethod: "STANDARD", ...totals, createdAt,
        items: { create: { productId: product.id, title: product.title, unitPriceCents: product.priceCents, vatBasisPoints: 2000, quantity: 1 + index % 2 } },
        addresses: { create: ["SHIPPING", "BILLING"].map(type => ({ type: type as "SHIPPING" | "BILLING", firstName: guest ? "Invité" : account.firstName, lastName: "Démo", line1: "1 rue de Démonstration", city: "Nantes", zip: "44000", country: "FR" })) },
        payments: { create: { provider: "mock", providerRef: `seed-payment-${index + 1}`, status: succeeded ? "SUCCEEDED" : status === "CANCELLED" ? "FAILED" : "PENDING", amountCents: totals.totalCents, createdAt } },
        history: { create: path.map((to, step) => ({ from: step === 0 ? null : path[step - 1], to, createdAt: new Date(createdAt.getTime() + step * 60000) })) },
        emails: succeeded ? { create: { eventKey: `seed-confirmation-${index + 1}`, recipient: guest ? "invite@artisanova.test" : account.email, template: "ORDER_CONFIRMED", payload: { reference, totalCents: totals.totalCents }, status: "SIMULATED", createdAt, sentAt: createdAt } } : undefined,
      } });
      // Preserve an existing larger sequence; reruns must never rewind references.
      await tx.orderSequence.upsert({ where: { day }, update: {}, create: { day, value: index + 1 } });
      await tx.orderSequence.updateMany({ where: { day, value: { lt: index + 1 } }, data: { value: index + 1 } });
    }
  }, { timeout: 30000 });
  console.info("Seed terminé : 4 comptes, 5 catégories, 5 artisans, 25 produits, 2 promotions et 10 commandes de démonstration. Les données existantes sont conservées.");
} finally {
  await db.$disconnect();
}
