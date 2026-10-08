import { requireUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { AccountForm } from "@/components/features/account-form";
export default async function AddressesPage(){
 const user=await requireUser();
 const addresses=await getDatabase().address.findMany({where:{userId:user.id},orderBy:[{type:"asc"},{isDefault:"desc"},{id:"asc"}]});
 const labels={firstName:"Prénom",lastName:"Nom",line1:"Adresse",line2:"Complément (facultatif)",city:"Ville",zip:"Code postal"};
 return <main id="contenu" tabIndex={-1} className="shop-main"><h1 className="page-title">Mes adresses</h1><p>France uniquement. Une adresse par défaut pour la livraison et une pour la facturation.</p><div className="account-grid">{addresses.map(a=><section className="artisan-panel" key={a.id}><h2>{a.type==="SHIPPING"?"Livraison":"Facturation"}{a.isDefault?" · Par défaut":""}</h2><p>{a.firstName} {a.lastName}<br/>{a.line1}<br/>{a.zip} {a.city}</p><details><summary>Modifier cette adresse</summary><AccountForm intent="address" id={a.id} address addressType={a.type} label="Enregistrer l’adresse" fields={Object.entries(labels).map(([name,label])=>({name,label,value:String(a[name as keyof typeof a]??""),required:name!=="line2"}))}/></details><AccountForm intent="delete" id={a.id} label="Supprimer"/></section>)}</div><section className="artisan-panel"><h2>Ajouter une adresse</h2><AccountForm intent="address" address label="Ajouter l’adresse" fields={Object.entries(labels).map(([name,label])=>({name,label,required:name!=="line2"}))}/></section></main>;
}
