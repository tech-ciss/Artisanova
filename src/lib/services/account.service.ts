import { compare, hash } from "bcryptjs";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { accountAddressInput, profileInput, passwordInput } from "@/lib/account/validation";
import { consumeAuthAttempt } from "./auth.service";
export class AccountError extends Error {}
async function lockUser(tx: Prisma.TransactionClient, userId: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
  if (!rows.length) throw new AccountError("Compte indisponible.");
}
export async function saveAddress(db: PrismaClient, userId: string, raw: unknown, id?: string) {
  const data = accountAddressInput.parse(raw);
  return db.$transaction(async tx => {
    await lockUser(tx, userId);
    const old = id ? await tx.address.findFirst({ where: { id, userId } }) : null;
    if (id && !old) throw new AccountError("Adresse indisponible.");
    const others = await tx.address.findMany({ where: { userId, type: data.type, ...(id ? { id: { not: id } } : {}) }, orderBy: { id: "asc" } });
    if (!id && await tx.address.count({ where: { userId } }) >= 20) throw new AccountError("Maximum 20 adresses par compte.");
    // Keep exactly one default for every nonempty address type, under a user row lock.
    const isDefault = data.isDefault || !others.length || (old?.type === data.type && old.isDefault);
    if (isDefault) await tx.address.updateMany({ where: { userId, type: data.type, isDefault: true }, data: { isDefault: false } });
    const address = id ? await tx.address.update({ where: { id }, data: { ...data, isDefault } }) : await tx.address.create({ data: { ...data, isDefault, userId } });
    if (old && old.type !== data.type && old.isDefault) {
      const replacement = await tx.address.findFirst({ where: { userId, type: old.type }, orderBy: { id: "asc" } });
      if (replacement) await tx.address.update({ where: { id: replacement.id }, data: { isDefault: true } });
    }
    return address;
  });
}
export async function deleteAddress(db: PrismaClient, userId: string, id: string) {
  return db.$transaction(async tx => {
    await lockUser(tx, userId);
    const address = await tx.address.findFirst({ where: { id, userId } });
    if (!address) throw new AccountError("Adresse indisponible.");
    await tx.address.delete({ where: { id } });
    if (address.isDefault) {
      const replacement = await tx.address.findFirst({ where: { userId, type: address.type }, orderBy: { id: "asc" } });
      if (replacement) await tx.address.update({ where: { id: replacement.id }, data: { isDefault: true } });
    }
  });
}
export async function updateProfile(db: PrismaClient, userId: string, raw: unknown, changePassword = false) {
  const data = changePassword ? passwordInput.parse(raw) : profileInput.parse(raw);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!await consumeAuthAttempt(db, user.email)) throw new AccountError("Trop de tentatives. Réessayez dans 15 minutes.");
  if (!await compare(data.currentPassword, user.passwordHash)) throw new AccountError("Mot de passe actuel incorrect.");
  const passwordHash = "password" in data ? await hash(data.password, 12) : undefined;
  try {
    await db.$transaction(async tx => {
      await lockUser(tx, userId);
      const fresh = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (fresh.passwordHash !== user.passwordHash || fresh.email !== user.email) throw new AccountError("Votre compte a changé. Rechargez la page.");
      if ("email" in data) await tx.user.update({ where: { id: userId }, data: { email: data.email, firstName: data.firstName, lastName: data.lastName } });
      else await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      if (changePassword || ("email" in data && data.email !== user.email)) {
        await tx.session.deleteMany({ where: { userId } });
        await tx.passwordResetToken.deleteMany({ where: { userId } });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AccountError("Cet email ne peut pas être utilisé.");
    throw error;
  }
  return changePassword || ("email" in data && data.email !== user.email);
}
export const orderStatusLabels = { PENDING_PAYMENT: "En attente de paiement", PAID: "Payée", PREPARING: "En préparation", SHIPPED: "Expédiée", DELIVERED: "Livrée", CANCELLED: "Annulée" };
export function accountOrder(db: PrismaClient, userId: string, reference: string) {
  return db.order.findFirst({ where: { userId, reference }, include: { items: true, addresses: true, history: { orderBy: { createdAt: "asc" } } } });
}
