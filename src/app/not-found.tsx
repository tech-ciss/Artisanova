import Link from "next/link";
import { ShopHeader, ShopFooter } from "@/components/features/shop-shell";
export default function NotFound() {
  return <><ShopHeader /><main id="contenu" className="shop-main"><p className="eyebrow">PAGE INTROUVABLE</p><h1 className="page-title">Cette création n’est plus ici.</h1><p>Explorez le catalogue pour découvrir les créations disponibles.</p><Link className="cta" href="/catalogue">Retour au catalogue</Link></main><ShopFooter /></>;
}
