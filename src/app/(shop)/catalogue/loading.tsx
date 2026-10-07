export default function Loading() {
  return <main id="contenu" className="shop-main" aria-busy="true"><p role="status">Chargement des créations…</p><div className="product-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <div className="skeleton-card" key={index} />)}</div></main>;
}
