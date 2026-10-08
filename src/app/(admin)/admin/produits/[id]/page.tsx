import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { AdminForm } from "@/components/features/admin-form";
import { productFields } from "@/lib/admin/product-fields";
import { formatPrice } from "@/lib/catalog/format";
export default async function ProductPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{saved?:string}>}) {
 await requireAdmin();const db=getDatabase(),{id}=await params;
 const [product,categories,artisans]=await Promise.all([db.product.findUnique({where:{id},include:{images:{orderBy:{position:"asc"}},stockMovements:{orderBy:{createdAt:"desc"},take:20,include:{actor:{select:{firstName:true,lastName:true}}}}}}),db.category.findMany({orderBy:{name:"asc"}}),db.artisan.findMany({orderBy:{name:"asc"}})]);
 if(!product)notFound();
 return <main id="contenu" tabIndex={-1} className="shop-main"><Link href="/admin/produits">← Produits</Link><h1 className="page-title">{product.title}</h1>{(await searchParams).saved==="1"&&<p role="status">Produit enregistré.</p>}<p>Prix HT calculé : {formatPrice(Math.round(product.priceCents*10000/(10000+product.vatBasisPoints)))} · TVA {product.vatBasisPoints/100} % · TTC {formatPrice(product.priceCents)}</p><div className="account-grid"><section className="artisan-panel"><h2>Modifier le produit</h2><AdminForm key={product.updatedAt.toISOString()} operation="product" id={id} label="Enregistrer le produit" fields={productFields(categories,artisans,product)}/></section><section><div className="artisan-panel"><h2>Retirer ou supprimer</h2><p>Un produit utilisé dans une commande, un panier ou un mouvement de stock est retiré du catalogue et conservé pour l’historique.</p><AdminForm operation="product-delete" id={id} label="Retirer / supprimer le produit" confirm/></div><h2>Derniers mouvements de stock</h2><ul>{product.stockMovements.map(m=><li key={m.id}>{m.createdAt.toLocaleString("fr-FR",{timeZone:"Europe/Paris"})} · {m.delta>0?"+":""}{m.delta} · {m.reason??m.kind}{m.actor?` · ${m.actor.firstName} ${m.actor.lastName}`:""}</li>)}</ul></section></div></main>;
}
