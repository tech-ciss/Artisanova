import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { normalizeSearch } from "@/lib/catalog/normalize";
import { categoryInput, productInput, promoInput, transitionInput, idInput } from "@/lib/admin/validation";
import { canTransition, revenueStatuses } from "./order-policy";
export class AdminError extends Error {}
export async function assertAdmin(db: Pick<PrismaClient, "user">, userId: string) {
  const user = await db.user.findUnique({ where: { id: idInput.parse(userId) }, select: { role: true } });
  if (user?.role !== "ADMIN") throw new AdminError("Accès administrateur requis.");
}
async function authorize(tx: Prisma.TransactionClient, actorId: string) {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${actorId} FOR SHARE`;
  await assertAdmin(tx, actorId);
}
async function guarded<T>(db: PrismaClient, actorId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>) {
  try { return await db.$transaction(async tx => { await authorize(tx, actorId); return operation(tx); }, { timeout: 15000 }); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AdminError("Ce slug ou code existe déjà. Choisissez une autre valeur.");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") throw new AdminError("Cet élément est encore utilisé et ne peut pas être supprimé.");
    throw error;
  }
}
export async function saveProduct(db: PrismaClient, actorId: string, raw: unknown, id?: string) {
  const input = productInput.parse(raw);
  if (id) idInput.parse(id);
  return guarded(db, actorId, async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('admin:featured-products', 0))::text`;
    if (id) await tx.$queryRaw`SELECT id FROM products WHERE id = ${id} FOR UPDATE`;
    const old = id ? await tx.product.findUnique({ where: { id } }) : null;
    if (id && !old) throw new AdminError("Produit indisponible.");
    if (old && (!input.expectedUpdatedAt || old.updatedAt.toISOString() !== input.expectedUpdatedAt)) throw new AdminError("Le produit a changé (stock ou autre modification). Rechargez avant d’enregistrer.");
    await tx.$queryRaw`SELECT id FROM categories WHERE id = ${input.categoryId} FOR SHARE`;
    const category = await tx.category.findUnique({ where: { id: input.categoryId } });
    if (!category || !await tx.artisan.findUnique({ where: { id: input.artisanId } })) throw new AdminError("Choisissez une catégorie et un artisan existants.");
    if (input.status === "PUBLISHED" && category.isArchived) throw new AdminError("Impossible de publier dans une catégorie archivée.");
    if (input.isFeatured && input.status !== "PUBLISHED") throw new AdminError("Un coup de cœur doit être publié.");
    if (input.isFeatured && !old?.isFeatured && await tx.product.count({ where: { isFeatured: true } }) >= 6) throw new AdminError("Maximum six coups de cœur. Retirez d’abord une autre sélection.");
    const delta = input.stock - (old?.stock ?? 0);
    if (delta && old && !input.stockReason) throw new AdminError("Indiquez le motif de l’ajustement de stock.");
    const data = { title: input.title, slug: input.slug, description: input.description, searchText: normalizeSearch(`${input.title} ${input.description}`), priceCents: input.price, vatBasisPoints: input.vat, stock: input.stock, categoryId: input.categoryId, artisanId: input.artisanId, status: input.status, isFeatured: input.isFeatured };
    const product = old ? await tx.product.update({ where: { id }, data }) : await tx.product.create({ data });
    await tx.productImage.deleteMany({ where: { productId: product.id } });
    await tx.productImage.createMany({ data: input.images.map((image, position) => ({ ...image, productId: product.id, position })) });
    if (delta) await tx.stockMovement.create({ data: { productId: product.id, kind: "ADJUSTMENT", delta, actorId, reason: input.stockReason || "Stock initial" } });
    return product;
  });
}
export async function deleteProduct(db: PrismaClient, actorId: string, id: string) {
  idInput.parse(id);
  return guarded(db, actorId, async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('admin:featured-products', 0))::text`;
    await tx.$queryRaw`SELECT id FROM products WHERE id = ${id} FOR UPDATE`;
    const product = await tx.product.findUnique({ where: { id } });
    if (!product) throw new AdminError("Produit indisponible.");
    // Preserve historical links and stock audit; retiring a used creation is explicit.
    if (await tx.orderItem.count({ where: { productId: id } }) || await tx.cartItem.count({ where: { productId: id } }) || await tx.stockMovement.count({ where: { productId: id } })) {
      await tx.product.update({ where: { id }, data: { status: "DRAFT", isFeatured: false } });
      return "Produit retiré du catalogue ; historique conservé.";
    }
    await tx.product.delete({ where: { id } });
    return "Produit supprimé.";
  });
}
export async function saveCategory(db: PrismaClient, actorId: string, raw: unknown, id?: string) {
  const data = categoryInput.parse(raw); if (id) idInput.parse(id);
  return guarded(db, actorId, async tx => {
    if (id) { await tx.$queryRaw`SELECT id FROM categories WHERE id = ${id} FOR UPDATE`; if (!await tx.category.findUnique({ where: { id } })) throw new AdminError("Catégorie indisponible."); }
    return id ? tx.category.update({ where: { id }, data: { ...data, image: data.image || null } }) : tx.category.create({ data: { ...data, image: data.image || null } });
  });
}
export async function deleteCategory(db: PrismaClient, actorId: string, id: string) {
  idInput.parse(id);
  return guarded(db, actorId, async tx => {
    await tx.$queryRaw`SELECT id FROM categories WHERE id = ${id} FOR UPDATE`;
    if (!await tx.category.findUnique({ where: { id } })) throw new AdminError("Catégorie indisponible.");
    if (await tx.product.count({ where: { categoryId: id } })) throw new AdminError("Catégorie utilisée : archivez-la au lieu de la supprimer.");
    await tx.category.delete({ where: { id } });
  });
}
export async function savePromo(db: PrismaClient, actorId: string, raw: unknown, id?: string) {
  const input = promoInput.parse(raw); if (id) idInput.parse(id);
  return guarded(db, actorId, async tx => {
    if (id) await tx.$queryRaw`SELECT id FROM promo_codes WHERE id = ${id} FOR UPDATE`;
    const old = id ? await tx.promoCode.findUnique({ where: { id } }) : null;
    if (id && !old) throw new AdminError("Promotion indisponible.");
    if (old && input.maxUses !== "" && input.maxUses < old.usedCount) throw new AdminError("Le maximum ne peut pas être inférieur aux utilisations déjà consommées.");
    const data = { code: input.code, type: input.type, value: input.type === "PERCENT" ? input.value / 100 : input.value, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, maxUses: input.maxUses === "" ? null : input.maxUses, isActive: input.isActive };
    return id ? tx.promoCode.update({ where: { id }, data }) : tx.promoCode.create({ data });
  });
}
export async function transitionOrder(db: PrismaClient, actorId: string, raw: unknown) {
  const input = transitionInput.parse(raw);
  return guarded(db, actorId, async tx => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${input.id} FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: input.id }, include: { items: true, payments: true } });
    if (!order) throw new AdminError("Commande indisponible.");
    if (order.status === input.to) return order; // Retry after a lost response has no duplicate effects.
    if (order.status !== input.from || !canTransition(order.status, input.to)) throw new AdminError("Transition interdite ou commande modifiée. Rechargez la page.");
    if (input.to === "PAID") throw new AdminError("La validation du paiement appartient au tunnel de commande, pas à une modification manuelle du statut.");
    if (input.to === "CANCELLED") {
      if (order.payments.some(payment => payment.status === "SUCCEEDED" && payment.provider !== "mock")) throw new AdminError("Remboursement externe non pris en charge : annulation refusée.");
      if (order.status === "PAID" || order.status === "PREPARING") {
        const quantities = new Map<string, number>();
        for (const item of order.items) { if (!item.productId) throw new AdminError("Produit historique absent : réapprovisionnement à examiner avant annulation."); quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity); }
        for (const [productId, quantity] of [...quantities].sort(([a], [b]) => a.localeCompare(b))) {
          await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;
          const restored = await tx.product.updateMany({ where: { id: productId, stock: { lte: 2147483647 - quantity } }, data: { stock: { increment: quantity } } });
          if (restored.count !== 1) throw new AdminError("Stock impossible à réapprovisionner.");
          await tx.stockMovement.create({ data: { orderId: order.id, productId, kind: "CANCELLATION", delta: quantity, actorId, reason: "Annulation de la commande" } });
        }
      }
      await tx.payment.updateMany({ where: { orderId: order.id, status: "SUCCEEDED", provider: "mock" }, data: { status: "REFUNDED" } });
      await tx.payment.updateMany({ where: { orderId: order.id, status: "PENDING" }, data: { status: "FAILED" } });
      // Promo usage remains consumed: an already used code is not renewed by cancellation.
    }
    await tx.orderStatusHistory.create({ data: { orderId: order.id, from: order.status, to: input.to, actorId } });
    if (input.to === "SHIPPED") await tx.emailLog.create({ data: { orderId: order.id, eventKey: `shipped:${order.id}`, recipient: order.email, template: "ORDER_SHIPPED", payload: { reference: order.reference } } });
    return tx.order.update({ where: { id: order.id }, data: { status: input.to } });
  });
}
export async function adminDashboard(db: PrismaClient, actorId: string, now = new Date()) {
  await assertAdmin(db, actorId);
  return db.$transaction(async tx => {
    const [month] = await tx.$queryRaw<{ start: Date; end: Date }[]>`SELECT (date_trunc('month', ${now}::timestamptz AT TIME ZONE 'Europe/Paris') AT TIME ZONE 'Europe/Paris') AS start, ((date_trunc('month', ${now}::timestamptz AT TIME ZONE 'Europe/Paris') + interval '1 month') AT TIME ZONE 'Europe/Paris') AS end`;
    const monthly = { createdAt: { gte: month.start, lt: month.end } };
    const [revenue, orders, unavailable, top] = await Promise.all([
      tx.order.aggregate({ where: { ...monthly, status: { in: revenueStatuses } }, _sum: { totalCents: true }, _count: true }),
      tx.order.count({ where: monthly }),
      tx.product.count({ where: { stock: 0, status: "PUBLISHED", category: { isArchived: false } } }),
      tx.orderItem.groupBy({ by: ["productId"], where: { productId: { not: null }, order: { status: { in: revenueStatuses } } }, _sum: { quantity: true }, orderBy: [{ _sum: { quantity: "desc" } }, { productId: "asc" }], take: 5 }),
    ]);
    const products = await tx.product.findMany({ where: { id: { in: top.flatMap(row => row.productId ? [row.productId] : []) } }, select: { id: true, title: true } });
    return { revenue: revenue._sum.totalCents ?? 0, orders, average: revenue._count ? Math.round((revenue._sum.totalCents ?? 0) / revenue._count) : 0, unavailable, top: top.map(row => ({ title: products.find(product => product.id === row.productId)?.title ?? "Produit retiré", quantity: row._sum.quantity ?? 0 })) };
  }, { isolationLevel: "RepeatableRead" });
}
