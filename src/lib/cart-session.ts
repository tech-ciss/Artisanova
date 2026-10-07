import "server-only";
import { cookies } from "next/headers";
import { tokenHash, readCart } from "./services/persistent-cart.service";
import { getDatabase } from "./db";
export const CART_COOKIE = "artisanova_cart";
export async function currentCart() {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  return readCart(getDatabase(), token ? tokenHash(token) : null);
}
