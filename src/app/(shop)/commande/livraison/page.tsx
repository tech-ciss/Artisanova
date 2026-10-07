import type { Metadata } from "next";
import Link from "next/link";
import { getDatabase } from "@/lib/db";
import { currentUser } from "@/lib/auth/session";
import { currentCart } from "@/lib/cart-session";
import { DeliveryForm } from "@/components/features/delivery-form";
import { CheckoutSteps } from "@/components/features/checkout-shell";
export const metadata: Metadata = { title: "Livraison", robots: { index: false, follow: false } };
export default async function DeliveryPage() {
  const [user, cart] = await Promise.all([currentUser(), currentCart()]);
  const addresses = user ? await getDatabase().address.findMany({ where: { userId: user.id, type: "SHIPPING" }, orderBy: [{ isDefault: "desc" }, { id: "asc" }], select: { id: true, firstName: true, lastName: true, line1: true, line2: true, city: true, zip: true, isDefault: true } }) : [];
  const blocked = !cart.items.length || cart.items.some(item => !item.available) || Boolean(cart.promotionError);
  return <main id="contenu" tabIndex={-1} className="shop-main checkout-page"><CheckoutSteps current={1} /><h1 className="page-title">Où livrer vos créations ?</h1><p>{user ? "Vos coordonnées enregistrées sont disponibles ci-dessous." : "Commandez en invité, sans créer de compte. Vous pourrez créer un compte après la confirmation."}</p><p className="demo-note">Boutique fictive : aucune livraison réelle, aucun paiement réel. Utilisez des coordonnées de démonstration.</p>{blocked ? <div className="empty-state"><p role="alert">Votre panier est vide ou contient une indisponibilité. Vérifiez les articles et le code promotionnel avant de poursuivre.</p><Link className="cta" href="/panier">Vérifier le panier</Link></div> : <DeliveryForm email={user?.email} firstName={user?.firstName} lastName={user?.lastName} addresses={addresses} />}<Link className="quiet-link" href="/panier">← Retour au panier</Link></main>;
}
