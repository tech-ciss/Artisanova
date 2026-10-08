import { currentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { accountOrder, orderStatusLabels } from "@/lib/services/account.service";
import { formatPrice } from "@/lib/catalog/format";
const escape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]!);
export async function GET(_: Request,{params}:{params:Promise<{reference:string}>}) {
 const user=await currentUser();
 const headers={"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex, nofollow","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; sandbox"};
 if(!user)return new Response("Connexion requise.",{status:401,headers});
 const {reference}=await params,order=await accountOrder(getDatabase(),user.id,reference);
 if(!order)return new Response("Document indisponible.",{status:404,headers});
 const billing=order.addresses.find(a=>a.type==="BILLING");
 const html=`<!doctype html><html lang="fr"><meta charset="utf-8"><title>Document ${escape(order.reference)}</title><style>body{font:16px system-ui;max-width:850px;margin:2rem;padding:1rem;color:#222}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:.6rem;border-bottom:1px solid #bbb}@media print{body{margin:0}}</style><h1>ARTISANOVA — Facture de démonstration</h1><p>Sans valeur comptable. Commande fictive, aucun débit réel.</p><p>Référence : ${escape(order.reference)}<br>Date : ${escape(order.createdAt.toLocaleDateString("fr-FR",{timeZone:"Europe/Paris"}))}<br>Statut : ${escape(orderStatusLabels[order.status])}</p><h2>Facturation</h2><p>${escape(order.email)}<br>${billing?`${escape(billing.firstName)} ${escape(billing.lastName)}<br>${escape(billing.line1)}<br>${escape(billing.line2)}<br>${escape(billing.zip)} ${escape(billing.city)} — France`:"Adresse non disponible"}</p><table><caption>Articles TTC — instantanés de la commande</caption><thead><tr><th>Création</th><th>Quantité</th><th>Prix TTC</th><th>TVA</th><th>Total TTC</th></tr></thead><tbody>${order.items.map(i=>`<tr><td>${escape(i.title)}</td><td>${i.quantity}</td><td>${escape(formatPrice(i.unitPriceCents))}</td><td>${i.vatBasisPoints/100} %</td><td>${escape(formatPrice(i.quantity*i.unitPriceCents))}</td></tr>`).join("")}</tbody></table><p>Sous-total : ${escape(formatPrice(order.subtotalCents))}<br>Remise : ${escape(formatPrice(order.discountCents))}<br>Livraison : ${escape(formatPrice(order.shippingCents))}<br><strong>Total TTC : ${escape(formatPrice(order.totalCents))}</strong></p></html>`;
 return new Response(html,{headers:{...headers,"Content-Type":"text/html; charset=utf-8","Content-Disposition":`attachment; filename="artisanova-${order.id.replace(/[^a-zA-Z0-9-]/g,"")}.html"`}});
}
