"use server";
import { currentUser } from "@/lib/auth/session";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { CART_COOKIE } from "@/lib/cart-session";
import { getDatabase } from "@/lib/db";
import { cartInput, CartError, mutateCart, tokenHash } from "@/lib/services/persistent-cart.service";
export async function changeCart(_previous: { message: string; error: boolean }, form: FormData) {
  const parsed = cartInput.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Vérifiez la quantité ou le code renseigné.", error: true };
  const store = await cookies();
  const user = await currentUser();
  let token = store.get(CART_COOKIE)?.value;
  if (!token || !tokenHash(token)) token = randomBytes(32).toString("hex");
  try { await mutateCart(getDatabase(), user ? { userId: user.id } : tokenHash(token)!, parsed.data); }
  catch (error) {
    if (!(error instanceof CartError)) console.error("Cart mutation failed", error instanceof Error ? error.name : "UnknownError");
    return { message: error instanceof CartError ? error.message : "Le panier est momentanément indisponible. Réessayez.", error: true };
  }
  if (!user) store.set(CART_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 24 * 3600 });
  revalidatePath("/", "layout");
  return { message: parsed.data.operation === "add" ? "Création ajoutée au panier." : "Panier mis à jour.", error: false };
}
