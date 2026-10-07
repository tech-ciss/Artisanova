import "server-only";
import { cookies } from "next/headers";
import { currentUser } from "@/lib/auth/session";
import { CART_COOKIE } from "@/lib/cart-session";
import { tokenHash, type CartOwner } from "@/lib/services/persistent-cart.service";
export const CHECKOUT_COOKIE = "artisanova_checkout";
export const RECEIPT_COOKIE = "artisanova_receipt";
export async function checkoutOwner(): Promise<CartOwner | null> {
  const user = await currentUser();
  if (user) return { userId: user.id };
  const token = (await cookies()).get(CART_COOKIE)?.value;
  return token ? tokenHash(token) : null;
}
