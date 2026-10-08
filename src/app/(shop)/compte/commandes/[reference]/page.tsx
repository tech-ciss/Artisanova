import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { accountOrder, orderStatusLabels } from "@/lib/services/account.service";
import { formatPrice } from "@/lib/catalog/format";
import { CheckoutTotals } from "@/components/features/checkout-shell";
export default async function OrderPage({params}:{params:Promise<{reference:string}>}){
 const user=await requireUser(),{reference}=await params,order=await accountOrder(getDatabase(),user.id,reference);
 if(!order)notFound();
 return <main id="contenu" tabIndex={-1} className="shop-main"><h1 className="page-title">Commande {order.reference}</h1><p>{orderStatusLabels[order.status]} · {order.createdAt.toLocaleDateString("fr-FR",{timeZone:"Europe/Paris"})}</p><div className="account-grid"><section><h2>Créations commandées</h2><ul className="checkout-items">{order.items.map(i=><li key={i.id}>{i.title} × {i.quantity}<strong>{formatPrice(i.unitPriceCents*i.quantity)}</strong></li>)}</ul><CheckoutTotals totals={order}/></section><section>{order.addresses.map(a=><div className="artisan-panel" key={a.id}><h2>{a.type==="SHIPPING"?"Livraison":"Facturation"}</h2><p>{a.firstName} {a.lastName}<br/>{a.line1}<br/>{a.line2}<br/>{a.zip} {a.city}</p></div>)}</section></div><h2>Suivi de la commande</h2><ol>{order.history.map(h=><li key={h.id}>{orderStatusLabels[h.to]} · {h.createdAt.toLocaleString("fr-FR",{timeZone:"Europe/Paris"})}</li>)}</ol><p><Link className="cta" href={`/compte/commandes/${order.reference}/facture`}>Télécharger la facture de démonstration</Link></p><p className="demo-note">Document HTML imprimable ; commande fictive, sans valeur comptable. Aucun paiement réel.</p></main>;
}
