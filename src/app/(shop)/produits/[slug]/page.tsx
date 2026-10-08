import { ProductDescription } from "@/components/features/product-description";
import { CartForm } from "@/components/features/cart-form";
import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDatabase } from "@/lib/db";
import { productBySlug, similarProducts } from "@/lib/services/catalog.service";
import { formatPrice } from "@/lib/catalog/format";
import { ProductGallery } from "@/components/features/product-gallery";
import { ProductCard } from "@/components/features/product-card";
export const dynamic = "force-dynamic";
const getProduct = cache((slug: string) => productBySlug(getDatabase(), slug));
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  return { title: product.title, description: product.description.slice(0, 160), alternates: { canonical: `/produits/${product.slug}` }, openGraph: {
    title: product.title, description: product.description.slice(0, 160), type: "website", images: product.images.map(image => ({ url: image.url, alt: image.alt })),
  } };
}
export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const similar = await similarProducts(getDatabase(), product.id, product.categoryId);
  return <main id="contenu" tabIndex={-1} className="shop-main"><nav className="breadcrumbs" aria-label="Fil d’Ariane"><Link href="/catalogue">Catalogue</Link><span aria-hidden="true">/</span><Link href={`/catalogue?category=${product.category.slug}`}>{product.category.name}</Link><span aria-hidden="true">/</span><span aria-current="page">{product.title}</span></nav>
    <div className="product-detail"><ProductGallery key={product.id} images={product.images} /><section aria-labelledby="product-title"><p className="eyebrow">{product.category.name}</p><h1 id="product-title" className="page-title">{product.title}</h1><p className="detail-price">{formatPrice(product.priceCents)} <small>TTC</small></p>
      <p className={product.stock > 0 ? "stock-available" : "stock-unavailable"}>{product.stock > 0 ? `${product.stock} pièce${product.stock > 1 ? "s" : ""} disponible${product.stock > 1 ? "s" : ""}` : "Cette création est en rupture de stock."}</p>
      <CartForm operation="add" productId={product.id} stock={product.stock} /><h2 className="small-heading">La création</h2><ProductDescription text={product.description} /><div className="artisan-panel"><p className="eyebrow">LES MAINS DERRIÈRE L’OBJET</p><h2 className="small-heading">{product.artisan.name}</h2><p>{product.artisan.bio}</p></div>
      <p className="demo-note">Boutique de démonstration. Commande et paiement entièrement simulés, sans débit ni livraison réels.</p><Link className="quiet-link" href="/catalogue">← Continuer à découvrir</Link>
    </section></div>
    {similar.length > 0 && <section className="related" aria-labelledby="similar-title"><h2 id="similar-title">Dans le même univers.</h2><div className="product-grid">{similar.map(entry => <ProductCard key={entry.id} product={entry} />)}</div></section>}
  </main>;
}
