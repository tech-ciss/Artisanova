import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { AdminForm } from "@/components/features/admin-form";
import { CheckoutTotals } from "@/components/features/checkout-shell";
import { orderTransitions } from "@/lib/services/order-policy";
import { orderStatusLabels } from "@/lib/services/account.service";
import { formatPrice } from "@/lib/catalog/format";
export default async function OrderPage({params}:{params:Promise<{id:string}>}){
 await requireAdmin();const {id}=await params;
 const order=await getDatabase().order.findUnique({where:{id},include:{items:true,addresses:true,payments:true,history:{orderBy:{createdAt:"asc"},include:{actor:{select:{firstName:true,lastName:true}}}}}});
 if(!order)notFound();
 const next=orderTransitions[order.status].filter(status=>status!=="PAID");
 return <main id="contenu" tabIndex={-1} className="shop-main"><Link href="/admin/commandes">← Commandes</Link><h1 className="page-title">{order.reference}</h1><p>{order.email} · {orderStatusLabels[order.status]}</p><div className="account-grid"><section><h2>Articles et montants TTC</h2><ul className="checkout-items">{order.items.map(i=><li key={i.id}>{i.title} × {i.quantity}<strong>{formatPrice(i.unitPriceCents*i.quantity)}</strong></li>)}</ul><CheckoutTotals totals={order}/><h2>Paiements</h2><ul>{order.payments.map(p=><li key={p.id}>{p.provider} · {p.status} · {formatPrice(p.amountCents)}</li>)}</ul></section><section>{order.addresses.map(a=><div className="artisan-panel" key={a.id}><h2>{a.type==="SHIPPING"?"Livraison":"Facturation"}</h2><p>{a.firstName} {a.lastName}<br/>{a.line1}<br/>{a.line2}<br/>{a.zip} {a.city}</p></div>)}</section></div><section className="artisan-panel"><h2>Changer le statut</h2>{next.length?<><p>L’annulation avant expédition rembourse le paiement fictif et réapprovisionne le stock. L’usage promo reste consommé.</p><AdminForm key={order.status} operation="transition" id={id} label="Appliquer le statut" confirm fields={[{name:"from",label:"",type:"hidden",value:order.status},{name:"to",label:"Nouveau statut",options:next.map(value=>({value,label:orderStatusLabels[value]})),value:next[0]}]}/></>:<p>{order.status==="PENDING_PAYMENT"?"Paiement en attente ; annulation possible depuis un statut autorisé.":"Aucune transition disponible : état terminal."}</p>}</section><h2>Historique</h2><ol>{order.history.map(h=><li key={h.id}>{orderStatusLabels[h.to]} · {h.createdAt.toLocaleString("fr-FR",{timeZone:"Europe/Paris"})}{h.actor?` · ${h.actor.firstName} ${h.actor.lastName}`:""}</li>)}</ol></main>;
}
