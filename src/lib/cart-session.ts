import "server-only";
import { cookies } from "next/headers";
import { tokenHash, readCart } from "./services/persistent-cart.service";
import { currentUser } from "./auth/session";
import { getDatabase } from "./db";
export const CART_COOKIE = "artisanova_cart";
export async function currentCart() {
  const user = await currentUser();
  const token = (await cookies()).get(CART_COOKIE)?.value;
  return readCart(getDatabase(), user ? { userId: user.id } : token ? tokenHash(token) : null);
}
