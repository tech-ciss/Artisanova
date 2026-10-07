import { getDatabase } from "@/lib/db";
import { catalogNavigation, featuredProducts } from "@/lib/services/catalog.service";
import { ProductCard } from "@/components/features/product-card";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Leaf, Package, Heart } from "lucide-react";

const visualCategories = [
  { name: "Céramiques", detail: "La beauté de l’imparfait", icon: "◒", color: "clay" },
  { name: "Bougies & savons", detail: "Les petits rituels du quotidien", icon: "◓", color: "sand" },
  { name: "Bijoux", detail: "Des détails qui vous ressemblent", icon: "◎", color: "rose" },
  { name: "Textiles", detail: "De la douceur, naturellement", icon: "▧", color: "sage" },
  { name: "Cosmétiques naturels", detail: "Prendre soin, tout simplement", icon: "❋", color: "cream" },
];

export const dynamic = "force-dynamic";
export default async function Home() {
  const db = getDatabase();
  const [navigation, featured] = await Promise.all([catalogNavigation(db), featuredProducts(db)]);
  return <>
    <main id="contenu" tabIndex={-1}>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy"><p className="eyebrow">FAIT AVEC LE CŒUR · EN FRANCE</p>
          <h1 id="hero-title">Des objets.<br />Des histoires.<br /><em>Du sens.</em></h1>
          <p>Des créations singulières pour les petits moments de la vie. Explorez l’univers des artisans français, et faites une place au fait main.</p>
          <Link className="cta" href="/catalogue">Explorer les collections <ArrowUpRight aria-hidden="true" size={20} /></Link>
          <a className="quiet-link" href="#histoire">Rencontrer Artisanova <ArrowDown aria-hidden="true" size={16} /></a>
        </div>
        <div className="hero-art" aria-hidden="true"><div className="art-caption">LE GOÛT DES CHOSES SIMPLES</div><div className="sun" /><div className="vase"><div className="stem stem-one" /><div className="stem stem-two" /><div className="stem stem-three" /></div><div className="bowl" /><div className="art-label">Une autre façon<br />de consommer.</div></div>
      </section>
      <div className="values" aria-label="Nos engagements"><span><Heart aria-hidden="true" size={20} /> Une sélection à taille humaine</span><span><Leaf aria-hidden="true" size={20} /> L’artisanat à l’honneur</span><span><Package aria-hidden="true" size={20} /> Des objets pour le quotidien</span></div>
      <section id="collections" className="collections" aria-labelledby="collections-title"><div className="section-heading"><div><p className="eyebrow">À CHAQUE ENVIE, SON UNIVERS</p><h2 id="collections-title">Le quotidien, en plus beau.</h2></div><p>Cinq univers à découvrir.<br />Une même attention aux détails.</p></div>
        <div className="category-grid">{navigation.categories.map((category, index) => <article className="category" key={category.id}><Link href={`/catalogue?category=${category.slug}`}><div className={`category-art ${(visualCategories.find(entry => entry.name === category.name) ?? visualCategories[index % visualCategories.length]).color}`} aria-hidden="true">{(visualCategories.find(entry => entry.name === category.name) ?? visualCategories[index % visualCategories.length]).icon}</div><h3>{category.name}</h3><p>{category.description}</p></Link></article>)}</div>
        <p className="demo-note">Découvrez le catalogue de démonstration. La commande sera disponible prochainement.</p>
      </section>
      {featured.length > 0 && <section className="collections" aria-labelledby="featured-title"><p className="eyebrow">NOTRE SÉLECTION</p><h2 id="featured-title">Les coups de cœur.</h2><div className="product-grid">{featured.map(product => <ProductCard key={product.id} product={product} />)}</div></section>}
      <section id="histoire" className="story" aria-labelledby="story-title"><p className="eyebrow">DE NANTES À VOTRE QUOTIDIEN</p><h2 id="story-title">Derrière chaque objet,<br />il y a des mains.</h2><p>Artisanova est née sur les marchés de créateurs et sur Instagram. Notre prochaine étape : réunir ces découvertes dans une boutique chaleureuse, où chaque création a la place de raconter son histoire.</p></section>
    </main>

  </>;
}
