"use client";
export default function ShopError({ reset }: { reset: () => void }) {
  return <main id="contenu" className="shop-main"><h1 className="page-title">Les créations font une petite pause.</h1><p>Le catalogue est momentanément indisponible. Veuillez réessayer dans quelques instants.</p><button className="cta" type="button" onClick={reset}>Réessayer</button></main>;
}
