import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkoutOwner, CHECKOUT_COOKIE } from "@/lib/checkout/session";
import { getDatabase } from "@/lib/db";
import { paymentReview, CheckoutError } from "@/lib/services/checkout.service";
import { CheckoutSteps, CheckoutTotals, CheckoutRecovery } from "@/components/features/checkout-shell";
import { PaymentForm } from "@/components/features/payment-form";
import { formatPrice } from "@/lib/catalog/format";
export const metadata: Metadata = { title: "Paiement fictif", robots: { index: false, follow: false } };
export default async function PaymentPage() {
  const owner = await checkoutOwner();
  const token = (await cookies()).get(CHECKOUT_COOKIE)?.value;
  if (!owner || !token) redirect("/commande/livraison");
  let review;
  try { review = await paymentReview(getDatabase(), owner, token); }
  catch (error) {
    if (!(error instanceof CheckoutError)) throw error;
    return <main id="contenu" tabIndex={-1} className="shop-main checkout-page"><CheckoutSteps current={2} /><h1 className="page-title">Vérifions votre commande.</h1><CheckoutRecovery message={error.message} /></main>;
  }
  if (review.completed) redirect(`/commande/confirmation/${review.order.reference}`);
  return <main id="contenu" tabIndex={-1} className="shop-main checkout-page"><CheckoutSteps current={2} /><h1 className="page-title">Un dernier regard.</h1><div className="checkout-layout"><section aria-labelledby="payment-title"><h2 id="payment-title">Paiement fictif</h2><PaymentForm totalCents={review.totals.totalCents} reviewId={review.reviewId} /></section><aside className="cart-summary"><h2>Votre commande</h2><ul className="checkout-items">{review.lines.map(line => <li key={line.productId}>{line.title} × {line.quantity}<strong>{formatPrice(line.unitPriceCents * line.quantity)}</strong></li>)}</ul>{review.code && <p>Code : {review.code}</p>}<CheckoutTotals totals={review.totals} /><h3>Livraison · {({ STANDARD: "Standard", RELAY: "Point relais fictif", EXPRESS: "Express" } as const)[review.data.shippingMethod]}</h3><p>{review.data.shipping.firstName} {review.data.shipping.lastName}<br />{review.data.shipping.line1}<br />{review.data.shipping.line2 && <>{review.data.shipping.line2}<br /></>}{review.data.shipping.zip} {review.data.shipping.city}, France</p><h3>Facturation</h3><p>{review.data.billing.firstName} {review.data.billing.lastName}<br />{review.data.billing.line1}<br />{review.data.billing.zip} {review.data.billing.city}, France</p><p>Récapitulatif simulé pour {review.data.email}</p><p>Les créations ne sont réservées qu’à la validation réussie de ce paiement fictif.</p></aside></div></main>;
}
