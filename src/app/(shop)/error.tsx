"use client";
export default function ShopError({ reset }: { reset: () => void }) {
  return <main id="contenu" className="shop-main"><h1 className="page-title">La boutique fait une petite pause.</h1><p>Le service est momentanément indisponible. Veuillez réessayer dans quelques instants.</p><button className="cta" type="button" onClick={reset}>Réessayer</button></main>;
}
