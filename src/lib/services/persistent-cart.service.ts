import { createHash } from "node:crypto";
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { calculateCart } from "./cart.service";

export const tokenHash = (token: string) => /^[a-f0-9]{64}$/.test(token) ? createHash("sha256").update(token).digest("hex") : null;
export class CartError extends Error {}
export const cartInput = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("add"), productId: z.string().min(1).max(100), quantity: z.coerce.number().int().min(1).max(999) }),
  z.object({ operation: z.literal("set"), productId: z.string().min(1).max(100), quantity: z.coerce.number().int().min(1).max(999) }),
  z.object({ operation: z.literal("remove"), productId: z.string().min(1).max(100) }),
  z.object({ operation: z.literal("promo"), code: z.string().trim().toUpperCase().max(40) }),
]);
const include = { items: { orderBy: { id: "asc" as const }, include: { product: { include: { category: true } } } } };
export async function readCart(db: PrismaClient, sessionId: string | null) {
  const cart = sessionId ? await db.cart.findUnique({ where: { sessionId }, include }) : null;
  const items = (cart?.items ?? []).map(item => ({ ...item, available: item.product.status === "PUBLISHED" && !item.product.category.isArchived && item.quantity <= item.product.stock }));
  const lines = items.filter(item => item.available).map(item => ({ productId: item.productId, unitPriceCents: item.product.priceCents, quantity: item.quantity, stock: item.product.stock }));
  const promo = cart?.promoCode ? await db.promoCode.findUnique({ where: { code: cart.promoCode } }) : null;
  let promotionError = "";
  let totals = calculateCart(lines);
  if (cart?.promoCode) {
    try {
      if (!promo) throw new Error();
      totals = calculateCart(lines, "STANDARD", { ...promo, expiresAt: promo.expiresAt ?? undefined, maxUses: promo.maxUses ?? undefined });
    } catch { promotionError = "Ce code n’est plus disponible. Le total est calculé sans remise."; }
  }
  return { items, count: items.reduce((sum, item) => sum + item.quantity, 0), code: cart?.promoCode ?? "", promotionError, totals };
}
export async function mutateCart(db: PrismaClient, sessionId: string, input: z.infer<typeof cartInput>) {
  const parsed = cartInput.safeParse(input);
  if (!parsed.success) throw new CartError("Vérifiez la quantité ou le code renseigné.");
  input = parsed.data;
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${sessionId}, 0))::text`;
    const cart = await tx.cart.upsert({ where: { sessionId }, create: { sessionId }, update: {} });
    // Serialize mutations across tabs; never trust a cart ID supplied by a visitor.
    await tx.$queryRaw`SELECT id FROM carts WHERE id = ${cart.id} FOR UPDATE`;
    if (input.operation === "promo") {
      if (input.code) {
        const promo = await tx.promoCode.findUnique({ where: { code: input.code } });
        try {
          if (!promo) throw new Error();
          calculateCart([], "STANDARD", { ...promo, expiresAt: promo.expiresAt ?? undefined, maxUses: promo.maxUses ?? undefined });
        } catch { throw new CartError("Code promotionnel inconnu, expiré ou épuisé."); }
      }
      await tx.cart.update({ where: { id: cart.id }, data: { promoCode: input.code || null } });
    } else if (input.operation === "remove") {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id, productId: input.productId } });
    } else {
      const product = await tx.product.findUnique({ where: { id: input.productId }, include: { category: true } });
      if (!product || product.status !== "PUBLISHED" || product.category.isArchived) throw new CartError("Cette création n’est plus disponible.");
      const where = { cartId_productId: { cartId: cart.id, productId: product.id } };
      const existing = await tx.cartItem.findUnique({ where });
      if (input.operation === "set" && !existing) throw new CartError("Cette création ne figure plus dans votre panier.");
      const quantity = input.quantity + (input.operation === "add" ? existing?.quantity ?? 0 : 0);
      if (quantity > product.stock || quantity > 999) throw new CartError(`Quantité indisponible : ${product.stock} pièce(s) en stock.`);
      if (!existing && await tx.cartItem.count({ where: { cartId: cart.id } }) >= 100) throw new CartError("Le panier peut contenir au maximum 100 créations différentes.");
      await tx.cartItem.upsert({ where, create: { cartId: cart.id, productId: product.id, quantity }, update: { quantity } });
    }
    await tx.cart.update({ where: { id: cart.id }, data: { updatedAt: new Date() } });
  });
}
