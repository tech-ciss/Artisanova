import { currentUser } from "@/lib/auth/session";
import Link from "next/link";
import { currentCart } from "@/lib/cart-session";

export async function ShopHeader() {
  const [cart, user] = await Promise.all([currentCart(), currentUser()]);
  return <><div className="announcement">Boutique de démonstration · Paiement simulé, aucun débit</div>
    <header className="site-header"><Link className="wordmark" href="/" aria-label="Artisanova, accueil">artisanova<span>✳</span></Link>
      <nav aria-label="Navigation principale"><Link href="/catalogue">Les créations</Link><Link href="/#collections">Les collections</Link><Link href="/#histoire">Notre histoire</Link><Link href="/panier" aria-label={`Mon panier, ${cart.count} article(s)`}>Panier <span aria-hidden="true">({cart.count})</span></Link><Link href={user ? "/compte" : "/connexion"}>{user ? "Mon compte" : "Connexion"}</Link>{user?.role === "ADMIN" && <Link href="/admin">Administration</Link>}</nav>
    </header></>;
}
export function ShopFooter() {
  return <footer className="site-footer"><Link className="wordmark" href="/">artisanova<span>✳</span></Link><p>Des objets choisis avec soin. Un projet né à Nantes.</p><a href="#contenu">Retour en haut ↑</a></footer>;
}
