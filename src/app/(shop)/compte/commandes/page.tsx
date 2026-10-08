import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { formatPrice } from "@/lib/catalog/format";
import { orderStatusLabels } from "@/lib/services/account.service";
export default async function OrdersPage({searchParams}:{searchParams:Promise<{page?:string}>}){
 const user=await requireUser(),query=await searchParams;
 const requested=/^[1-9]\d{0,5}$/.test(query.page??"")?Number(query.page):1;
 const db=getDatabase(),count=await db.order.count({where:{userId:user.id}}),pages=Math.max(1,Math.ceil(count/10)),page=Math.min(requested,pages);
 const orders=await db.order.findMany({where:{userId:user.id},orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(page-1)*10,take:10,select:{reference:true,status:true,createdAt:true,totalCents:true}});
 return <main id="contenu" tabIndex={-1} className="shop-main"><h1 className="page-title">Mes commandes</h1>{!orders.length?<p>Aucune commande dans ce compte. <Link href="/catalogue">Découvrir les créations</Link></p>:<ul className="account-orders">{orders.map(o=><li className="artisan-panel" key={o.reference}><h2><Link href={`/compte/commandes/${o.reference}`}>{o.reference}</Link></h2><p>{o.createdAt.toLocaleDateString("fr-FR",{timeZone:"Europe/Paris"})} · {orderStatusLabels[o.status]} · {formatPrice(o.totalCents)}</p><Link href={`/compte/commandes/${o.reference}/facture`}>Télécharger le document de démonstration</Link></li>)}</ul>}<nav className="account-nav" aria-label="Pagination des commandes">{page>1&&<Link href={`?page=${page-1}`}>Précédente</Link>}<span>Page {page} sur {pages}</span>{page<pages&&<Link href={`?page=${page+1}`}>Suivante</Link>}</nav></main>;
}
