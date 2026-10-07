import { createHash, randomBytes } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { deliveryData, deliveryDataSchema, paymentInput, DECLINED_CARD, orderDay } from "@/lib/checkout/validation";
import { calculateCart, type ShippingMethod } from "./cart.service";
import { cartWhere, cartLockKey, lockCartOwners, tokenHash, type CartOwner } from "./persistent-cart.service";
export class CheckoutError extends Error {}
const cartInclude = { items: { orderBy: { productId: "asc" as const }, include: { product: { include: { category: true } } } } };
type Reader = Pick<PrismaClient, "cart" | "promoCode">;
export async function checkoutQuote(db: Reader, owner: CartOwner, shipping: ShippingMethod) {
  const cart = await db.cart.findUnique({ where: cartWhere(owner), include: cartInclude });
  if (!cart || cart.mergedAt || !cart.items.length) throw new CheckoutError("Votre panier est vide ou a changé. Revenez au panier.");
  if (cart.items.some(item => item.quantity > item.product.stock || item.product.status !== "PUBLISHED" || item.product.category.isArchived)) throw new CheckoutError("Une création n’est plus disponible dans la quantité choisie. Ajustez votre panier.");
  const promo = cart.promoCode ? await db.promoCode.findUnique({ where: { code: cart.promoCode } }) : null;
  const lines = cart.items.map(item => ({ productId: item.productId, title: item.product.title, unitPriceCents: item.product.priceCents, vatBasisPoints: item.product.vatBasisPoints, quantity: item.quantity, stock: item.product.stock }));
  let totals;
  try {
    if (cart.promoCode && !promo) throw new Error();
    totals = calculateCart(lines, shipping, promo ? { ...promo, expiresAt: promo.expiresAt ?? undefined, maxUses: promo.maxUses ?? undefined } : undefined);
  } catch { throw new CheckoutError("Le code promotionnel n’est plus disponible. Retirez-le ou remplacez-le dans le panier."); }
  if (totals.subtotalCents > 2147483647 || totals.totalCents > 2147483647) throw new CheckoutError("Le montant du panier dépasse la limite acceptée. Réduisez les quantités.");
  const fingerprint = createHash("sha256").update(JSON.stringify({ lines: lines.map(line => ({ productId: line.productId, title: line.title, unitPriceCents: line.unitPriceCents, vatBasisPoints: line.vatBasisPoints, quantity: line.quantity })), totals, promo: promo ? { id: promo.id, code: promo.code, type: promo.type, value: promo.value } : null, shipping })).digest("hex");
  return { cart, lines, totals, promo, fingerprint };
}
export async function prepareCheckout(db: PrismaClient, owner: CartOwner, raw: unknown) {
  const parsed = deliveryInputSafe(raw);
  return db.$transaction(async tx => {
    await lockCartOwners(tx, [owner]);
    const quote = await checkoutQuote(tx, owner, parsed.shippingMethod);
    const token = randomBytes(32).toString("hex");
    await tx.checkoutDraft.create({ data: { tokenHash: tokenHash(token)!, cartId: quote.cart.id, ownerKey: cartLockKey(owner), data: parsed, fingerprint: quote.fingerprint, expiresAt: new Date(Date.now() + 3600000) } });
    return token;
  });
}
function deliveryInputSafe(raw: unknown) {
  try { return deliveryData(raw); } catch { throw new CheckoutError("Vérifiez les informations de livraison."); }
}
async function ownedDraft(db: Pick<PrismaClient, "checkoutDraft">, owner: CartOwner, token: string) {
  const digest = tokenHash(token);
  const draft = digest ? await db.checkoutDraft.findUnique({ where: { tokenHash: digest } }) : null;
  if (!draft || draft.ownerKey !== cartLockKey(owner)) throw new CheckoutError("Votre session de commande a changé. Reprenez la livraison.");
  if (!draft.orderId && draft.expiresAt <= new Date()) throw new CheckoutError("Votre session de commande a expiré. Reprenez la livraison.");
  return draft;
}
export async function paymentReview(db: PrismaClient, owner: CartOwner, token: string) {
  const draft = await ownedDraft(db, owner, token);
  if (draft.orderId) return { completed: true as const, order: await db.order.findUniqueOrThrow({ where: { id: draft.orderId }, select: { reference: true } }) };
  const data = deliveryDataSchema.parse(draft.data);
  const quote = await checkoutQuote(db, owner, data.shippingMethod);
  if (quote.fingerprint !== draft.fingerprint) throw new CheckoutError("Le prix ou le contenu du panier a changé. Reprenez la livraison pour vérifier le nouveau total.");
  return { completed: false as const, reviewId: draft.id, data, lines: quote.lines, totals: quote.totals, code: quote.promo?.code };
}
export async function placeOrder(db: PrismaClient, owner: CartOwner, token: string, rawPayment: unknown) {
  const payment = paymentInput().safeParse(rawPayment);
  if (!payment.success) throw new CheckoutError("Vérifiez les informations de la carte fictive.");
  return db.$transaction(async tx => {
    await lockCartOwners(tx, [owner]);
    const draft = await ownedDraft(tx, owner, token);
    if (payment.data.reviewId !== draft.id) throw new CheckoutError("Une autre commande a été préparée dans un autre onglet. Rechargez le paiement pour vérifier le total.");
    if (draft.orderId) return tx.order.findUniqueOrThrow({ where: { id: draft.orderId }, select: { id: true, reference: true } });
    if (payment.data.number === DECLINED_CARD) throw new CheckoutError("Paiement fictif refusé. Votre panier est conservé ; essayez une carte de réussite.");
    const data = deliveryDataSchema.parse(draft.data);
    const cart = await tx.cart.findUnique({ where: { id: draft.cartId }, include: cartInclude });
    if (!cart || !cart.items.length) throw new CheckoutError("Votre panier est vide. Revenez au panier.");
    const productIds = cart.items.map(item => item.productId).sort();
    await tx.$queryRaw(Prisma.sql`SELECT id FROM products WHERE id IN (${Prisma.join(productIds)}) ORDER BY id FOR UPDATE`);
    const products = await tx.product.findMany({ where: { id: { in: productIds } }, select: { categoryId: true } });
    const categoryIds = [...new Set(products.map(product => product.categoryId))].sort();
    await tx.$queryRaw(Prisma.sql`SELECT id FROM categories WHERE id IN (${Prisma.join(categoryIds)}) ORDER BY id FOR SHARE`);
    if (cart.promoCode) await tx.$queryRaw`SELECT id FROM promo_codes WHERE code = ${cart.promoCode} FOR UPDATE`;
    const quote = await checkoutQuote(tx, owner, data.shippingMethod);
    if (quote.fingerprint !== draft.fingerprint) throw new CheckoutError("Le prix ou le contenu du panier a changé. Reprenez la livraison pour vérifier le nouveau total.");
    for (const line of quote.lines) {
      const changed = await tx.product.updateMany({ where: { id: line.productId, stock: { gte: line.quantity }, status: "PUBLISHED" }, data: { stock: { decrement: line.quantity } } });
      if (changed.count !== 1) throw new CheckoutError("Une création vient d’être achetée. Ajustez votre panier.");
    }
    if (quote.promo) {
      const changed = await tx.promoCode.updateMany({ where: { id: quote.promo.id, isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }], ...(quote.promo.maxUses !== null ? { usedCount: { lt: quote.promo.maxUses } } : {}) }, data: { usedCount: { increment: 1 } } });
      if (changed.count !== 1) throw new CheckoutError("Ce code promotionnel vient d’être épuisé. Modifiez votre panier.");
    }
    const day = orderDay();
    const sequence = await tx.orderSequence.upsert({ where: { day }, create: { day, value: 1 }, update: { value: { increment: 1 } } });
    const reference = `ART-${day}-${String(sequence.value).padStart(4, "0")}`;
    const order = await tx.order.create({ data: {
      reference, idempotencyKey: `checkout:${draft.id}`, userId: typeof owner === "string" ? null : owner.userId,
      email: data.email, accessTokenHash: typeof owner === "string" ? tokenHash(token) : null, accessTokenExpiresAt: typeof owner === "string" ? new Date(Date.now() + 30 * 86400000) : null,
      status: "PAID", shippingMethod: data.shippingMethod, ...quote.totals, promoCodeId: quote.promo?.id, promoCodeSnapshot: quote.promo?.code,
      items: { create: quote.lines.map(line => ({ productId: line.productId, title: line.title, unitPriceCents: line.unitPriceCents, vatBasisPoints: line.vatBasisPoints, quantity: line.quantity })) },
      addresses: { create: [{ ...data.shipping, type: "SHIPPING" }, { ...data.billing, type: "BILLING" }] },
      payments: { create: { provider: "mock", providerRef: `mock:${draft.id}`, status: "SUCCEEDED", amountCents: quote.totals.totalCents } },
      history: { create: [{ from: null, to: "PENDING_PAYMENT" }, { from: "PENDING_PAYMENT", to: "PAID" }] },
      stockMovements: { create: quote.lines.map(line => ({ productId: line.productId, kind: "SALE", delta: -line.quantity })) },
      emails: { create: [
        { eventKey: `confirmation:${draft.id}`, recipient: data.email, template: "ORDER_CONFIRMED", payload: { reference, ...quote.totals, items: quote.lines.map(line => ({ title: line.title, quantity: line.quantity, unitPriceCents: line.unitPriceCents })) } },
        { eventKey: `admin:${draft.id}`, recipient: deliveryDataSchema.shape.email.parse(process.env.ADMIN_NOTIFICATION_EMAIL ?? "admin@artisanova.test"), template: "NEW_ORDER_ADMIN", payload: { reference, totalCents: quote.totals.totalCents } },
      ] },
    }, select: { id: true, reference: true } });
    await tx.checkoutDraft.update({ where: { id: draft.id }, data: { orderId: order.id } });
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    await tx.cart.update({ where: { id: cart.id }, data: { promoCode: null } });
    return order;
  }, { timeout: 15000 });
}
export async function confirmedOrder(db: PrismaClient, reference: string, userId: string | undefined, receiptToken: string | undefined) {
  const digest = receiptToken ? tokenHash(receiptToken) : null;
  return db.order.findFirst({ where: { reference, OR: [...(userId ? [{ userId }] : []), ...(digest ? [{ userId: null, accessTokenHash: digest, accessTokenExpiresAt: { gt: new Date() } }] : [])] }, include: { items: true, addresses: true } });
}
