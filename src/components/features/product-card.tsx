import Image from "next/image";
import Link from "next/link";
import type { CatalogProduct } from "@/lib/services/catalog.service";
import { formatPrice } from "@/lib/catalog/format";
export function ProductCard({ product }: { product: CatalogProduct }) {
  const image = product.images[0];
  return <article className="product-card"><Link href={`/produits/${product.slug}`} className="product-link">
    <div className="product-image">{image ? <Image src={image.url} alt={image.alt} width={400} height={480} sizes="(min-width: 1000px) 25vw, (min-width: 600px) 33vw, 50vw" /> : <span>Visuel à venir</span>}
      {product.stock === 0 && <span className="stock-badge">Rupture de stock</span>}</div>
    <p className="eyebrow">{product.category.name}</p><h3>{product.title}</h3><p className="maker">{product.artisan.name}</p><p className="product-price">{formatPrice(product.priceCents)} <small>TTC</small></p>
  </Link></article>;
}
