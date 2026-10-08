import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { getDatabase } from "@/lib/db";
import { resolveSession } from "@/lib/services/auth.service";
export const AUTH_COOKIE = "artisanova_session";
export const currentUser = cache(async () => {
  const token = (await cookies()).get(AUTH_COOKIE)?.value;
  return token ? resolveSession(getDatabase(), token) : null;
});
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") notFound();
  return user;
}
