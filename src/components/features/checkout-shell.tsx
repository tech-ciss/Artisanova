import Link from "next/link";
import type { calculateCart } from "@/lib/services/cart.service";
import { formatPrice } from "@/lib/catalog/format";
export function CheckoutSteps({ current }: { current: 1 | 2 | 3 }) {
  return <nav aria-label="Étapes de commande"><ol className="checkout-steps">{["Livraison", "Paiement fictif", "Confirmation"].map((label, index) => <li key={label} aria-current={current === index + 1 ? "step" : undefined}><span>{index + 1}</span>{index === 0 && current === 2 ? <Link href="/commande/livraison">{label}</Link> : label}</li>)}</ol></nav>;
}
export function CheckoutTotals({ totals }: { totals: ReturnType<typeof calculateCart> }) {
  return <dl className="checkout-totals"><div><dt>Sous-total TTC</dt><dd>{formatPrice(totals.subtotalCents)}</dd></div><div><dt>Remise</dt><dd>− {formatPrice(totals.discountCents)}</dd></div><div><dt>Livraison</dt><dd>{formatPrice(totals.shippingCents)}</dd></div><div className="cart-total"><dt>Total TTC</dt><dd>{formatPrice(totals.totalCents)}</dd></div></dl>;
}
export function CheckoutRecovery({ message }: { message: string }) {
  return <div className="empty-state"><p role="alert" className="field-error">{message}</p><Link className="cta" href="/commande/livraison">Reprendre la livraison</Link><p><Link className="quiet-link" href="/panier">Vérifier mon panier</Link></p></div>;
}
