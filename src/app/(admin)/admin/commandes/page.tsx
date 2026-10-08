import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { orderStatuses } from "@/lib/admin/validation";
import { orderStatusLabels } from "@/lib/services/account.service";
import { formatPrice } from "@/lib/catalog/format";
import { AdminPagination, parseAdminSearch, type AdminSearch } from "@/components/features/admin-list";
import type { Prisma } from "@/generated/prisma/client";
export default async function OrdersPage({searchParams}:{searchParams:Promise<AdminSearch>}){
 await requireAdmin();const db=getDatabase(),{filters,invalid}=parseAdminSearch(await searchParams);
 const where:Prisma.OrderWhereInput={...(filters.status?{status:filters.status}:{}),...(filters.q?{OR:[{reference:{contains:filters.q,mode:"insensitive"}},{email:{contains:filters.q,mode:"insensitive"}},{user:{firstName:{contains:filters.q,mode:"insensitive"}}},{user:{lastName:{contains:filters.q,mode:"insensitive"}}}]}:{})};
 if(filters.date){const [bounds]=await db.$queryRaw<{start:Date;end:Date}[]>`SELECT (${filters.date}::date::timestamp AT TIME ZONE 'Europe/Paris') AS start, ((${filters.date}::date + 1)::timestamp AT TIME ZONE 'Europe/Paris') AS end`;where.createdAt={gte:bounds.start,lt:bounds.end};}
 const count=await db.order.count({where}),pages=Math.max(1,Math.ceil(count/20)),page=Math.min(filters.page,pages);
 const orders=await db.order.findMany({where,orderBy:[{createdAt:"desc"},{id:"desc"}],take:20,skip:(page-1)*20,select:{id:true,reference:true,email:true,status:true,createdAt:true,totalCents:true}});
 return <main id="contenu" tabIndex={-1} className="shop-main"><h1 className="page-title">Commandes</h1>{invalid&&<p role="alert">Filtres invalides. Liste réinitialisée.</p>}<form className="admin-filters"><div><label htmlFor="order-q">Client, email ou référence</label><input id="order-q" name="q" defaultValue={filters.q} maxLength={120}/></div><div><label htmlFor="order-status">Statut</label><select id="order-status" name="status" defaultValue={filters.status}><option value="">Tous</option>{orderStatuses.map(s=><option key={s} value={s}>{orderStatusLabels[s]}</option>)}</select></div><div><label htmlFor="order-date">Date de création (Europe/Paris)</label><input id="order-date" type="date" name="date" defaultValue={filters.date}/></div><button className="cta">Filtrer</button><Link href="/admin/commandes">Réinitialiser</Link></form><ul className="account-orders">{orders.map(o=><li className="artisan-panel" key={o.id}><h2><Link href={`/admin/commandes/${o.id}`}>{o.reference}</Link></h2><p>{o.email} · {orderStatusLabels[o.status]} · {o.createdAt.toLocaleString("fr-FR",{timeZone:"Europe/Paris"})} · {formatPrice(o.totalCents)}</p></li>)}</ul>{!orders.length&&<p>Aucune commande pour ces filtres.</p>}<AdminPagination page={page} pages={pages} query={filters}/></main>;
}
