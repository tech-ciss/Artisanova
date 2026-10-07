import type { PrismaClient } from "@/generated/prisma/client";
/** Local simulation only; never sends mail or prints recipients/addresses/card data. */
export async function simulateEmails(db: PrismaClient, orderId?: string) {
  const pending = await db.emailLog.findMany({ where: { status: "PENDING", ...(orderId ? { orderId } : {}) }, orderBy: { createdAt: "asc" }, take: 100, select: { id: true, template: true } });
  let count = 0;
  for (const email of pending) {
    const changed = await db.emailLog.updateMany({ where: { id: email.id, status: "PENDING" }, data: { status: "SIMULATED", attempts: { increment: 1 }, sentAt: new Date() } });
    if (changed.count) { count++; console.info(`Email simulé : ${email.template} (${email.id}). Contenu conservé en base.`); }
  }
  return count;
}
