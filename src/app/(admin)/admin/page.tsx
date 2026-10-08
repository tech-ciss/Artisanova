import { requireAdmin } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { adminDashboard } from "@/lib/services/admin.service";
import { formatPrice } from "@/lib/catalog/format";
export default async function Dashboard() {
  const admin = await requireAdmin(), data = await adminDashboard(getDatabase(), admin.id);
  return <main id="contenu" tabIndex={-1} className="shop-main"><p className="eyebrow">VUE D’ENSEMBLE</p><h1 className="page-title">Tableau de bord</h1><p>Mois en cours, calendrier Europe/Paris. Données et paiements de démonstration.</p><dl className="admin-kpis"><div><dt>CA TTC du mois</dt><dd>{formatPrice(data.revenue)}</dd></div><div><dt>Commandes du mois</dt><dd>{data.orders}</dd></div><div><dt>Panier moyen payé</dt><dd>{formatPrice(data.average)}</dd></div><div><dt>Produits publics en rupture</dt><dd>{data.unavailable}</dd></div></dl><p className="form-help">CA et panier moyen : commandes créées ce mois, payées et non annulées. Le nombre de commandes inclut tous les statuts.</p><section className="artisan-panel"><h2>Les cinq créations les plus vendues</h2><p>Toutes périodes, commandes payées et non annulées.</p>{data.top.length ? <ol>{data.top.map((item, index) => <li key={index}>{item.title} · {item.quantity} pièce(s)</li>)}</ol> : <p>Aucune vente à afficher.</p>}</section></main>;
}
