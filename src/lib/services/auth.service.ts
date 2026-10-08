import { createHash, randomBytes } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { loginInput, signupInput } from "@/lib/auth/validation";
import { cartWhere, lockCartOwners, tokenHash, type CartOwner } from "./persistent-cart.service";

export class AuthError extends Error {}
export const SESSION_SECONDS = 30 * 24 * 3600;
export const userSelect = { id: true, email: true, firstName: true, lastName: true, role: true } as const;
const DUMMY_HASH = "$2b$12$ZgxTJ7P74KChQyfdPV6.reBSJepw.bTSLk8sp6O72d1j3edCQsZC.";
export const throttleKey = (email: string) => `auth:email:${createHash("sha256").update(email).digest("hex")}`;

/** Database-backed fixed window. No untrusted X-Forwarded-For dependency. */
export async function consumeAuthAttempt(db: PrismaClient, email: string) {
  return db.$transaction(async tx => {
    for (const [key, limit] of [["auth:global", 200], [throttleKey(email), 10]] as const) {
      const rows = await tx.$queryRaw<{ attempts: number }[]>`
        INSERT INTO auth_throttles (key, attempts, "resetsAt")
        VALUES (${key}, 1, CURRENT_TIMESTAMP + INTERVAL '15 minutes')
        ON CONFLICT (key) DO UPDATE SET
          attempts = CASE WHEN auth_throttles."resetsAt" <= CURRENT_TIMESTAMP THEN 1 ELSE LEAST(auth_throttles.attempts + 1, ${limit + 1}) END,
          "resetsAt" = CASE WHEN auth_throttles."resetsAt" <= CURRENT_TIMESTAMP THEN CURRENT_TIMESTAMP + INTERVAL '15 minutes' ELSE auth_throttles."resetsAt" END
        RETURNING attempts`;
      if (rows[0].attempts > limit) return false; // Commit the attempt even when refused.
    }
    return true;
  });
}

/** Caller must already have verified the credentials. Runs inside the session transaction. */
async function mergeGuestCart(tx: Prisma.TransactionClient, userId: string, guestHash: string | null) {
  if (!guestHash) return false;
  const owner: CartOwner = { userId };
  await lockCartOwners(tx, [owner, guestHash]);
  const guest = await tx.cart.findUnique({ where: { sessionId: guestHash }, include: { items: true } });
  if (!guest || guest.mergedAt) return false;
  const account = await tx.cart.upsert({ where: cartWhere(owner), create: { userId }, update: {} });
  const items = await tx.cartItem.findMany({ where: { cartId: account.id } });
  const quantities = new Map(items.map(item => [item.productId, item.quantity]));
  for (const item of guest.items) quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  if (quantities.size > 100 || [...quantities.values()].some(quantity => quantity > 999)) {
    throw new AuthError("Les deux paniers dépassent la limite de 100 créations ou 999 pièces par ligne. Réduisez le panier invité avant de vous connecter.");
  }
  for (const { productId } of guest.items) {
    const quantity = quantities.get(productId)!;
    await tx.cartItem.upsert({ where: { cartId_productId: { cartId: account.id, productId } }, create: { cartId: account.id, productId, quantity }, update: { quantity } });
  }
  await tx.cart.update({ where: { id: account.id }, data: { promoCode: guest.promoCode ?? account.promoCode, updatedAt: new Date() } });
  await tx.cartItem.deleteMany({ where: { cartId: guest.id } });
  // A consumed token cannot recreate its cart from an older in-flight request.
  await tx.cart.update({ where: { id: guest.id }, data: { mergedAt: new Date(), promoCode: null } });
  return guest.items.length > 0;
}
async function issueSession(tx: Prisma.TransactionClient, userId: string, guestHash: string | null, oldToken?: string) {
  const merged = await mergeGuestCart(tx, userId, guestHash);
  const oldHash = oldToken ? tokenHash(oldToken) : null;
  if (oldHash) await tx.session.deleteMany({ where: { tokenHash: oldHash } });
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await tx.session.create({ data: { userId, tokenHash: tokenHash(token)!, expiresAt } });
  return { token, expiresAt, merged };
}
async function attachGuestOrder(tx: Prisma.TransactionClient, userId: string, email: string, receiptHash?: string) {
  if (!receiptHash) return undefined;
  const order = await tx.order.findFirst({ where: { accessTokenHash: receiptHash, accessTokenExpiresAt: { gt: new Date() }, email }, select: { id: true, reference: true, userId: true } });
  if (!order || (order.userId && order.userId !== userId)) throw new AuthError("Pour rattacher la commande, utilisez son adresse email et le navigateur de confirmation. L’accès peut aussi avoir expiré.");
  if (!order.userId) {
    const changed = await tx.order.updateMany({ where: { id: order.id, userId: null }, data: { userId } });
    if (!changed.count && (await tx.order.findUnique({ where: { id: order.id }, select: { userId: true } }))?.userId !== userId) throw new AuthError("Cette commande ne peut plus être rattachée.");
  }
  return order.reference;
}
export async function authenticate(db: PrismaClient, raw: unknown, guestHash: string | null, oldToken?: string, receiptHash?: string) {
  const parsed = loginInput.safeParse(raw);
  if (!parsed.success) throw new AuthError("Vérifiez votre email et votre mot de passe.");
  const { email, password } = parsed.data;
  if (!await consumeAuthAttempt(db, email)) throw new AuthError("Trop de tentatives. Réessayez dans 15 minutes.");
  const user = await db.user.findUnique({ where: { email }, select: { ...userSelect, passwordHash: true } });
  const valid = await compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) throw new AuthError("Email ou mot de passe incorrect.");
  return db.$transaction(async tx => {
    // Serialize session issuance with profile/password changes and their revocation.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${user.id} FOR UPDATE`;
    const fresh = await tx.user.findUnique({ where: { id: user.id }, select: { passwordHash: true, email: true } });
    if (!fresh || fresh.passwordHash !== user.passwordHash || fresh.email !== user.email) throw new AuthError("Votre compte a changé. Recommencez la connexion.");
    const attachedReference = await attachGuestOrder(tx, user.id, user.email, receiptHash);
    return { ...await issueSession(tx, user.id, guestHash, oldToken), attachedReference };
  }, { timeout: 15000 });
}
export async function register(db: PrismaClient, raw: unknown, guestHash: string | null, oldToken?: string, receiptHash?: string) {
  const parsed = signupInput.safeParse(raw);
  if (!parsed.success) throw new AuthError("Vérifiez les informations du formulaire.");
  const { email, password, firstName, lastName } = parsed.data;
  if (!await consumeAuthAttempt(db, email)) throw new AuthError("Trop de tentatives. Réessayez dans 15 minutes.");
  const passwordHash = await hash(password, 12);
  try {
    return await db.$transaction(async tx => {
      const user = await tx.user.create({ data: { email, passwordHash, firstName, lastName }, select: { id: true } });
      const attachedReference = await attachGuestOrder(tx, user.id, email, receiptHash);
      return { ...await issueSession(tx, user.id, guestHash, oldToken), attachedReference };
    }, { timeout: 15000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AuthError("Impossible de créer ce compte. Vérifiez les informations ou connectez-vous.");
    throw error;
  }
}
export async function resolveSession(db: Pick<PrismaClient, "session">, token: string | undefined, now = new Date()) {
  const tokenDigest = token ? tokenHash(token) : null;
  if (!tokenDigest) return null;
  const session = await db.session.findUnique({ where: { tokenHash: tokenDigest }, select: { expiresAt: true, user: { select: userSelect } } });
  return session && session.expiresAt > now ? session.user : null;
}
export async function revokeSession(db: Pick<PrismaClient, "session">, token: string | undefined) {
  const tokenDigest = token ? tokenHash(token) : null;
  if (tokenDigest) await db.session.deleteMany({ where: { tokenHash: tokenDigest } });
}
