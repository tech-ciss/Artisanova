import Link from "next/link";
import { ArrowDown, ArrowUpRight, Leaf, Package, Heart } from "lucide-react";

const categories = [
  { name: "Céramiques", detail: "La beauté de l’imparfait", icon: "◒", color: "clay" },
  { name: "Bougies & savons", detail: "Les petits rituels du quotidien", icon: "◓", color: "sand" },
  { name: "Bijoux", detail: "Des détails qui vous ressemblent", icon: "◎", color: "rose" },
  { name: "Textiles", detail: "De la douceur, naturellement", icon: "▧", color: "sage" },
  { name: "Cosmétiques naturels", detail: "Prendre soin, tout simplement", icon: "❋", color: "cream" },
];

export default function Home() {
  return <>
    <div className="announcement">L’artisanat français, à portée de main</div>
    <header className="site-header">
      <Link className="wordmark" href="/" aria-label="Artisanova, accueil">artisanova<span>✳</span></Link>
      <nav aria-label="Navigation principale"><a href="#collections">Les collections</a><a href="#histoire">Notre histoire</a></nav>
    </header>
    <main id="contenu" tabIndex={-1}>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow">FAIT AVEC LE CŒUR · EN FRANCE</p>
          <h1 id="hero-title">Des objets.<br />Des histoires.<br /><em>Du sens.</em></h1>
          <p>Des créations singulières pour les petits moments de la vie. Explorez l’univers des artisans français, et faites une place au fait main.</p>
          <a className="cta" href="#collections">Explorer les collections <ArrowUpRight aria-hidden="true" size={20} /></a>
          <a className="quiet-link" href="#histoire">Rencontrer Artisanova <ArrowDown aria-hidden="true" size={16} /></a>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="art-caption">LE GOÛT DES CHOSES SIMPLES</div><div className="sun" /><div className="vase"><div className="stem stem-one" /><div className="stem stem-two" /><div className="stem stem-three" /></div><div className="bowl" /><div className="art-label">Une autre façon<br />de consommer.</div></div>
      </section>
      <div className="values" aria-label="Nos engagements"><span><Heart aria-hidden="true" size={20} /> Une sélection à taille humaine</span><span><Leaf aria-hidden="true" size={20} /> L’artisanat à l’honneur</span><span><Package aria-hidden="true" size={20} /> Des objets pour le quotidien</span></div>
      <section id="collections" className="collections" aria-labelledby="collections-title"><div className="section-heading"><div><p className="eyebrow">À CHAQUE ENVIE, SON UNIVERS</p><h2 id="collections-title">Le quotidien, en plus beau.</h2></div><p>Cinq univers à découvrir.<br />Une même attention aux détails.</p></div>
        <div className="category-grid">{categories.map(category => <article className="category" key={category.name}><div className={`category-art ${category.color}`} aria-hidden="true">{category.icon}</div><h3>{category.name}</h3><p>{category.detail}</p></article>)}</div>
        <p className="demo-note">La boutique se prépare : le catalogue et la commande seront disponibles dans une prochaine étape.</p>
      </section>
      <section id="histoire" className="story" aria-labelledby="story-title"><p className="eyebrow">DE NANTES À VOTRE QUOTIDIEN</p><h2 id="story-title">Derrière chaque objet,<br />il y a des mains.</h2><p>Artisanova est née sur les marchés de créateurs et sur Instagram. Notre prochaine étape : réunir ces découvertes dans une boutique chaleureuse, où chaque création a la place de raconter son histoire.</p></section>
    </main>
    <footer className="site-footer"><Link className="wordmark" href="/">artisanova<span>✳</span></Link><p>Des objets choisis avec soin. Un projet né à Nantes.</p><a href="#contenu">Retour en haut ↑</a></footer>
  </>;
}
