import { requireAdmin } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { AdminPagination, parseAdminSearch, type AdminSearch } from "@/components/features/admin-list";
export default async function EmailsPage({searchParams}:{searchParams:Promise<AdminSearch>}){
 await requireAdmin();const db=getDatabase(),{filters,invalid}=parseAdminSearch(await searchParams),where=filters.q?{OR:[{recipient:{contains:filters.q,mode:"insensitive" as const}},{template:{contains:filters.q,mode:"insensitive" as const}}]}:{};
 const count=await db.emailLog.count({where}),pages=Math.max(1,Math.ceil(count/20)),page=Math.min(filters.page,pages);
 const emails=await db.emailLog.findMany({where,orderBy:[{createdAt:"desc"},{id:"asc"}],take:20,skip:(page-1)*20,select:{id:true,recipient:true,template:true,status:true,createdAt:true,attempts:true}});
 return <main id="contenu" tabIndex={-1} className="shop-main"><h1 className="page-title">Historique des emails</h1><p>Simulation uniquement, aucun envoi externe. Les contenus sont conservés en base.</p>{invalid&&<p role="alert">Filtre invalide.</p>}<form className="admin-filters"><label htmlFor="email-q">Destinataire ou événement</label><input id="email-q" name="q" defaultValue={filters.q} maxLength={120}/><button className="cta">Rechercher</button></form><ul className="account-orders">{emails.map(e=><li className="artisan-panel" key={e.id}><h2>{e.template}</h2><p>{e.recipient} · {e.status} · {e.attempts} tentative(s) · {e.createdAt.toLocaleString("fr-FR",{timeZone:"Europe/Paris"})}</p></li>)}</ul>{!emails.length&&<p>Aucun email pour cette recherche.</p>}<AdminPagination page={page} pages={pages} query={filters}/></main>;
}
