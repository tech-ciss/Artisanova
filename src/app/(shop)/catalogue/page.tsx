import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDatabase } from "@/lib/db";
import { catalogNavigation, listCatalog } from "@/lib/services/catalog.service";
import { catalogFiltersSchema, catalogUrl, parseCatalogParameters, type SearchParameters } from "@/lib/validations/catalog";
import { ProductCard } from "@/components/features/product-card";
import { PriceFilter } from "@/components/features/price-filter";
export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParameters> }): Promise<Metadata> {
  const params = await searchParams;
  const filtered = Object.values(params).some(value => value !== undefined && value !== "");
  return { title: "Les créations artisanales", description: "Explorez les créations Artisanova par catégorie, budget et disponibilité.", alternates: { canonical: "/catalogue" }, robots: filtered ? { index: false, follow: true } : undefined };
}
export default async function CatalogPage({ searchParams }: { searchParams: Promise<SearchParameters> }) {
  const parsed = parseCatalogParameters(await searchParams);
  const filters = parsed.success ? parsed.data : catalogFiltersSchema.parse({});
  const errors: Record<string, string> = {};
  if (!parsed.success) for (const issue of parsed.error.issues) errors[String(issue.path[0])] = issue.message;
  const fieldNames: Record<string, string> = { q: "Recherche", category: "Catégorie", min: "Prix minimum", max: "Prix maximum", sort: "Tri", page: "Page", available: "Disponibilité" };
  const db = getDatabase();
  const navigation = await catalogNavigation(db);
  const results = parsed.success ? await listCatalog(db, filters) : null;
  if (results && results.page !== filters.page) redirect(catalogUrl(filters, results.page));
  return <main id="contenu" tabIndex={-1} className="shop-main">
    <p className="eyebrow">DES CRÉATIONS À DÉCOUVRIR</p><h1 className="page-title">Le catalogue.</h1><p className="page-intro">Des objets pour vos petits rituels. Trouvez votre prochaine découverte.</p>
    {!parsed.success && <div className="form-errors" role="alert"><h2>Corrigez les filtres</h2><ul>{parsed.error.issues.map((issue, index) => <li key={index}>{fieldNames[String(issue.path[0])] ?? "Filtres"} : {issue.message}</li>)}</ul><p>Les filtres ont été réinitialisés pour vous permettre de recommencer.</p></div>}
    <div className="catalog-layout"><form action="/catalogue" method="get" className="catalog-filters" aria-label="Filtrer les créations">
      <label htmlFor="search">Rechercher<input id="search" name="q" type="search" maxLength={120} defaultValue={filters.q} aria-invalid={!!errors.q} aria-describedby={errors.q ? "q-error" : undefined} placeholder="Tasse, bougie, lin…" /></label>{errors.q && <p id="q-error" className="field-error">{errors.q}</p>}
      <label htmlFor="category">Catégorie<select id="category" name="category" defaultValue={filters.category} aria-invalid={!!errors.category} aria-describedby={errors.category ? "category-error" : undefined}><option value="">Toutes les collections</option>{navigation.categories.map(category => <option value={category.slug} key={category.id}>{category.name}</option>)}</select></label>{errors.category && <p id="category-error" className="field-error">{errors.category}</p>}
      <PriceFilter key={`${filters.min}-${filters.max}`} min={filters.min} max={filters.max} ceilingCents={navigation.ceilingCents} errors={errors} />
      <label className="checkbox-label"><input name="available" type="checkbox" value="1" defaultChecked={filters.available} /> En stock uniquement</label>
      <label htmlFor="sort">Trier par<select id="sort" name="sort" defaultValue={filters.sort} aria-invalid={!!errors.sort} aria-describedby={errors.sort ? "sort-error" : undefined}><option value="newest">Nouveautés</option><option value="price-asc">Prix croissant</option><option value="price-desc">Prix décroissant</option><option value="popular">Popularité</option></select></label>
      {errors.sort && <p id="sort-error" className="field-error">{errors.sort}</p>}
      <button className="cta" type="submit">Appliquer les filtres</button><Link className="quiet-link" href="/catalogue">Tout réinitialiser</Link>
    </form><section aria-labelledby="results-title"><h2 id="results-title" className="results-title">{results ? `${results.total} création${results.total > 1 ? "s" : ""}` : "Filtres à corriger"}</h2>
      {results?.total === 0 && <div className="empty-state"><h3>Aucune création ne correspond.</h3><p>Essayez un autre mot-clé ou un budget plus large.</p><Link href="/catalogue">Voir toutes les créations</Link></div>}
      <div className="product-grid">{results?.products.map(product => <ProductCard product={product} key={product.id} />)}</div>
      {results && results.pages > 1 && <nav className="pagination" aria-label="Pagination du catalogue">
        {results.page > 1 && <Link href={catalogUrl(filters, results.page - 1)} rel="prev">← Précédente</Link>}
        <span aria-current="page">Page {results.page} sur {results.pages}</span>
        {results.page < results.pages && <Link href={catalogUrl(filters, results.page + 1)} rel="next">Suivante →</Link>}
      </nav>}
    </section></div>
  </main>;
}
