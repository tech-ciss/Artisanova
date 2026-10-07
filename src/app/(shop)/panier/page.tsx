import type { Metadata } from "next";
import Link from "next/link";
import { currentCart } from "@/lib/cart-session";
import { formatPrice } from "@/lib/catalog/format";
import { CartForm } from "@/components/features/cart-form";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Mon panier", robots: { index: false, follow: false } };
export default async function CartPage() {
  const cart = await currentCart();
  return <main id="contenu" tabIndex={-1} className="shop-main"><p className="eyebrow">VOS CRÉATIONS CHOISIES</p><h1 className="page-title">Mon panier</h1>
    {!cart.items.length ? <div className="empty-state"><p>Votre panier attend ses premières créations.</p><Link className="cta" href="/catalogue">Découvrir le catalogue</Link></div> : <div className="cart-layout"><section aria-label="Articles du panier">{cart.items.map(item => <article className="cart-item" key={item.id}><h2><Link href={`/produits/${item.product.slug}`}>{item.product.title}</Link></h2><p>{formatPrice(item.product.priceCents)} TTC / pièce · {formatPrice(item.product.priceCents * item.quantity)}</p>{!item.available && <p className="field-error">Création indisponible ou quantité supérieure au stock ({item.product.stock}). Cette ligne est exclue du total ; ajustez-la ou supprimez-la.</p>}<CartForm operation="set" productId={item.productId} title={item.product.title} quantity={item.quantity} stock={item.product.stock} /><CartForm operation="remove" productId={item.productId} title={item.product.title} /></article>)}</section><aside className="cart-summary" aria-labelledby="summary-title"><h2 id="summary-title">Récapitulatif</h2><dl><div><dt>Sous-total TTC</dt><dd>{formatPrice(cart.totals.subtotalCents)}</dd></div><div><dt>Remise</dt><dd>− {formatPrice(cart.totals.discountCents)}</dd></div><div><dt>Livraison standard</dt><dd>{formatPrice(cart.totals.shippingCents)}</dd></div><div className="cart-total"><dt>Total TTC</dt><dd>{formatPrice(cart.totals.totalCents)}</dd></div></dl><p>Livraison offerte dès 60 € après remise, sinon 5,90 €. Les prix et disponibilités sont vérifiés à chaque mise à jour ; le panier ne réserve pas le stock.</p><CartForm operation="promo" code={cart.code} />{cart.promotionError && <p role="status" className="field-error">{cart.promotionError}</p>}<p className="demo-note">Boutique de démonstration : le paiement et la commande sans compte seront disponibles lors de l’étape commande.</p></aside></div>}
    <Link className="quiet-link" href="/catalogue">← Continuer mes découvertes</Link></main>;
}
