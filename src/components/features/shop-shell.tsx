import Link from "next/link";

export function ShopHeader() {
  return <><div className="announcement">Catalogue de démonstration · Commandes disponibles prochainement</div>
    <header className="site-header"><Link className="wordmark" href="/" aria-label="Artisanova, accueil">artisanova<span>✳</span></Link>
      <nav aria-label="Navigation principale"><Link href="/catalogue">Les créations</Link><Link href="/#collections">Les collections</Link><Link href="/#histoire">Notre histoire</Link></nav>
    </header></>;
}
export function ShopFooter() {
  return <footer className="site-footer"><Link className="wordmark" href="/">artisanova<span>✳</span></Link><p>Des objets choisis avec soin. Un projet né à Nantes.</p><a href="#contenu">Retour en haut ↑</a></footer>;
}
