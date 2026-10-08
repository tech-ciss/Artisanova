import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { formatPrice } from "@/lib/catalog/format";
import { AdminForm } from "@/components/features/admin-form";
import { AdminPagination, parseAdminSearch, type AdminSearch } from "@/components/features/admin-list";
import { productFields } from "@/lib/admin/product-fields";
export default async function ProductsPage({searchParams}:{searchParams:Promise<AdminSearch>}) {
  await requireAdmin();
  const db=getDatabase(),raw=await searchParams,{filters,invalid}=parseAdminSearch(raw);
  const where=filters.q?{OR:[{title:{contains:filters.q,mode:"insensitive" as const}},{slug:{contains:filters.q,mode:"insensitive" as const}}]}:{};
  const count=await db.product.count({where}),pages=Math.max(1,Math.ceil(count/20)),page=Math.min(filters.page,pages);
  const [products,categories,artisans]=await Promise.all([db.product.findMany({where,orderBy:[{updatedAt:"desc"},{id:"asc"}],take:20,skip:(page-1)*20,include:{category:true,artisan:true}}),db.category.findMany({orderBy:{name:"asc"}}),db.artisan.findMany({orderBy:{name:"asc"}})]);
  return <main id="contenu" tabIndex={-1} className="shop-main"><h1 className="page-title">Produits</h1>{raw.removed==="1"&&<p role="status">Produit supprimé ou retiré du catalogue ; l’historique des produits utilisés est conservé.</p>}{invalid&&<p role="alert">Filtre invalide. Liste réinitialisée.</p>}<form className="admin-filters"><label htmlFor="product-q">Titre ou slug</label><input id="product-q" name="q" defaultValue={filters.q} maxLength={120}/><button className="cta">Rechercher</button></form><ul className="account-orders">{products.map(p=><li className="artisan-panel" key={p.id}><h2><Link href={`/admin/produits/${p.id}`}>{p.title}</Link></h2><p>{p.status==="PUBLISHED"?"Publié":"Brouillon"} · {p.category.name}{p.category.isArchived?" (archivée)":""} · {p.stock} pièce(s) · {formatPrice(p.priceCents)} TTC{p.isFeatured?" · Coup de cœur":""}</p></li>)}</ul>{!products.length&&<p>Aucun produit trouvé.</p>}<AdminPagination page={page} pages={pages} query={filters}/><section className="artisan-panel"><h2>Créer un produit</h2><AdminForm operation="product" label="Créer le produit" fields={productFields(categories,artisans)}/></section></main>;
}
