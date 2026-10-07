"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AUTH_COOKIE } from "@/lib/auth/session";
import { CART_COOKIE } from "@/lib/cart-session";
import { loginInput, signupInput, type AuthState } from "@/lib/auth/validation";
import { authenticate, register, revokeSession, AuthError, SESSION_SECONDS } from "@/lib/services/auth.service";
import { tokenHash } from "@/lib/services/persistent-cart.service";
import { getDatabase } from "@/lib/db";
async function submitAuth(mode: "login" | "signup", form: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(form);
  const values = Object.fromEntries(["email", "firstName", "lastName"].map(key => [key, typeof raw[key] === "string" ? raw[key].slice(0, key === "email" ? 254 : 80) : ""]));
  const parsed = (mode === "login" ? loginInput : signupInput).safeParse(raw);
  if (!parsed.success) return { message: "Vérifiez les champs signalés.", errors: Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).filter(([, errors]) => errors?.length)) as Record<string, string[]>, values };
  const store = await cookies();
  const guestToken = store.get(CART_COOKIE)?.value;
  let result;
  try {
    result = await (mode === "login" ? authenticate : register)(getDatabase(), parsed.data, guestToken ? tokenHash(guestToken) : null, store.get(AUTH_COOKIE)?.value);
  } catch (error) {
    if (!(error instanceof AuthError)) console.error("Authentication failed", error instanceof Error ? error.name : "UnknownError");
    return { message: error instanceof AuthError ? error.message : "Le service est momentanément indisponible. Réessayez.", values };
  }
  store.set(AUTH_COOKIE, result.token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS, expires: result.expiresAt });
  store.delete(CART_COOKIE);
  revalidatePath("/", "layout");
  redirect(result.merged ? "/panier?fusion=1" : "/compte");
}
export async function signIn(_state: AuthState, form: FormData): Promise<AuthState> { return submitAuth("login", form); }
export async function signUp(_state: AuthState, form: FormData): Promise<AuthState> { return submitAuth("signup", form); }
export async function signOut(): Promise<AuthState> {
  const store = await cookies();
  try { await revokeSession(getDatabase(), store.get(AUTH_COOKIE)?.value); }
  catch { return { message: "La déconnexion n’a pas abouti. Réessayez." }; }
  store.delete(AUTH_COOKIE);
  store.delete(CART_COOKIE);
  revalidatePath("/", "layout");
  redirect("/connexion?deconnexion=1");
}
