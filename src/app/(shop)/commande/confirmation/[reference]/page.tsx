import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { RECEIPT_COOKIE } from "@/lib/checkout/session";
import { getDatabase } from "@/lib/db";
import { confirmedOrder } from "@/lib/services/checkout.service";
import { CheckoutSteps, CheckoutTotals } from "@/components/features/checkout-shell";
import { formatPrice } from "@/lib/catalog/format";
export const metadata: Metadata = { title: "Confirmation de commande", robots: { index: false, follow: false } };
export default async function ConfirmationPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const user = await currentUser();
  const order = await confirmedOrder(getDatabase(), reference, user?.id, (await cookies()).get(RECEIPT_COOKIE)?.value);
  if (!order) notFound();
  const address = order.addresses.find(address => address.type === "SHIPPING");
  return <main id="contenu" tabIndex={-1} className="shop-main checkout-page"><CheckoutSteps current={3} /><p className="eyebrow">PAIEMENT FICTIF VALIDÉ</p><h1 className="page-title">Merci pour votre commande.</h1><p className="order-reference">Commande <strong>{order.reference}</strong></p><p>Votre commande de démonstration est enregistrée. Aucune somme n’a été débitée et aucun colis ne sera envoyé.</p><div className="checkout-layout"><section><h2>Vos créations</h2><ul className="checkout-items">{order.items.map(item => <li key={item.id}>{item.title} × {item.quantity}<strong>{formatPrice(item.unitPriceCents * item.quantity)}</strong></li>)}</ul><p role="status">Le récapitulatif email est conservé en base et son envoi est simulé. Aucun email réel n’est envoyé.</p>{!order.userId && <div className="artisan-panel"><h2>Retrouver cette commande dans un compte</h2><p>Créez un compte facultatif avec l’adresse {order.email} pour rattacher cette commande.</p><Link className="cta" href="/inscription?commande=1">Créer mon compte</Link><p><Link className="quiet-link" href="/connexion?commande=1">J’ai déjà un compte</Link></p></div>}</section><aside className="cart-summary"><h2>Récapitulatif TTC</h2><CheckoutTotals totals={order} />{order.promoCodeSnapshot && <p>Code : {order.promoCodeSnapshot}</p>}{address && <><h3>Livraison</h3><p>{address.firstName} {address.lastName}<br />{address.line1}<br />{address.zip} {address.city}</p></>}</aside></div><Link className="quiet-link" href="/catalogue">Continuer à découvrir →</Link></main>;
}
