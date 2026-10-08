"use client";
export default function AdminError({ reset }: { reset: () => void }) { return <main id="contenu" className="shop-main"><h1>Administration indisponible</h1><p>Réessayez dans quelques instants.</p><button className="cta" onClick={reset}>Réessayer</button></main>; }
