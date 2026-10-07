"use client";
import { useActionState, useId } from "react";
import Link from "next/link";
import { changeCart } from "@/app/(shop)/panier/actions";
export function CartForm({ operation, productId, title, stock = 999, quantity = 1, code = "" }: { operation: "add" | "set" | "remove" | "promo"; productId?: string; title?: string; stock?: number; quantity?: number; code?: string }) {
  const [state, action, pending] = useActionState(changeCart, { message: "", error: false });
  const id = useId();
  return <form action={action} className="cart-form" aria-busy={pending}>
    <input type="hidden" name="operation" value={operation} />
    {productId && <input type="hidden" name="productId" value={productId} />}
    {(operation === "add" || operation === "set") && <><label htmlFor={id}>Quantité{title ? ` · ${title}` : ""}</label><input id={id} name="quantity" type="number" min="1" max={Math.max(1, Math.min(stock, 999))} defaultValue={quantity} required /></>}
    {operation === "promo" && <><label htmlFor={id}>Code promotionnel (un seul code)</label><input id={id} name="code" maxLength={40} defaultValue={code} autoCapitalize="characters" placeholder="BIENVENUE10" /><small>Pour retirer le code, videz le champ puis appliquez.</small></>}
    <button className="cta" disabled={pending || (operation === "add" && stock === 0)}>{pending ? "Mise à jour…" : { add: "Ajouter au panier", set: "Mettre à jour", remove: `Supprimer ${title ?? "l’article"}`, promo: "Appliquer" }[operation]}</button>
    <p id={`${id}-status`} role="status" className={state.error ? "field-error" : "stock-available"}>{state.message} {operation === "add" && state.message && !state.error && <Link href="/panier">Voir mon panier →</Link>}</p>
  </form>;
}
