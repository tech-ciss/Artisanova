"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDatabase } from "@/lib/db";
import { currentUser } from "@/lib/auth/session";
import { checkoutOwner, CHECKOUT_COOKIE, RECEIPT_COOKIE } from "@/lib/checkout/session";
import { deliveryInput, paymentInput, type CheckoutState } from "@/lib/checkout/validation";
import { prepareCheckout, placeOrder, CheckoutError } from "@/lib/services/checkout.service";
import { simulateEmails } from "@/lib/services/email.service";
export async function submitDelivery(_previous: CheckoutState, form: FormData): Promise<CheckoutState> {
  const raw = Object.fromEntries(form);
  const values = Object.fromEntries(Object.entries(raw).filter(([key, value]) => !key.startsWith("$") && typeof value === "string").map(([key, value]) => [key, String(value).slice(0, 254)]));
  const user = await currentUser();
  if (user) raw.email = user.email;
  if (raw.addressId) {
    const address = user && typeof raw.addressId === "string" ? await getDatabase().address.findFirst({ where: { id: raw.addressId, userId: user.id, type: "SHIPPING" } }) : null;
    if (!address) return { message: "Cette adresse n’est pas disponible dans votre compte.", values };
    Object.assign(raw, { firstName: address.firstName, lastName: address.lastName, line1: address.line1, line2: address.line2 ?? "", city: address.city, zip: address.zip, country: address.country });
  }
  const parsed = deliveryInput.safeParse(raw);
  if (!parsed.success) return { message: "Vérifiez les champs signalés.", errors: Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).filter(([, errors]) => errors?.length)) as Record<string, string[]>, values };
  const owner = await checkoutOwner();
  if (!owner) return { message: "Votre panier n’est plus disponible. Revenez au panier.", values };
  let token;
  try { token = await prepareCheckout(getDatabase(), owner, parsed.data); }
  catch (error) {
    if (!(error instanceof CheckoutError)) console.error("Checkout preparation failed", error instanceof Error ? error.name : "UnknownError");
    return { message: error instanceof CheckoutError ? error.message : "Impossible de préparer la commande. Réessayez.", values };
  }
  (await cookies()).set(CHECKOUT_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/commande", maxAge: 3600 });
  redirect("/commande/paiement");
}
export async function submitPayment(_previous: CheckoutState, form: FormData): Promise<CheckoutState> {
  const parsed = paymentInput().safeParse(Object.fromEntries(form));
  if (!parsed.success) return { message: "Vérifiez les champs de la carte fictive.", errors: Object.fromEntries(Object.entries(parsed.error.flatten().fieldErrors).filter(([, errors]) => errors?.length)) as Record<string, string[]> };
  const store = await cookies();
  const owner = await checkoutOwner();
  const token = store.get(CHECKOUT_COOKIE)?.value;
  if (!owner || !token) return { message: "Votre session de commande a expiré. Reprenez la livraison." };
  let order;
  try { order = await placeOrder(getDatabase(), owner, token, parsed.data); }
  catch (error) {
    if (!(error instanceof CheckoutError)) console.error("Checkout failed", error instanceof Error ? error.name : "UnknownError");
    return { message: error instanceof CheckoutError ? error.message : "La commande n’a pas abouti. Réessayez ; un même paiement ne crée pas deux commandes." };
  }
  if (typeof owner === "string") store.set(RECEIPT_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 86400 });
  try { await simulateEmails(getDatabase(), order.id); }
  catch { console.warn("Confirmation email simulation pending; retry the outbox."); }
  revalidatePath("/", "layout");
  redirect(`/commande/confirmation/${order.reference}`);
}
