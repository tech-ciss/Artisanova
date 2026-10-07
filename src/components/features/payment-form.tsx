"use client";
import { useActionState, useEffect, useId, useRef } from "react";
import { submitPayment } from "@/app/(shop)/commande/actions";
import { mockCards, DECLINED_CARD, type CheckoutState } from "@/lib/checkout/validation";
import { formatPrice } from "@/lib/catalog/format";
export function PaymentForm({ totalCents, reviewId }: { totalCents: number; reviewId: string }) {
  const [state, action, pending] = useActionState(submitPayment, { message: "" } as CheckoutState);
  const id = useId(), form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.errors) form.current?.querySelector<HTMLInputElement>('[aria-invalid="true"]')?.focus(); }, [state]);
  return <><div className="demo-note"><strong>Paiement entièrement simulé. Aucune somme débitée.</strong><p>Utilisez uniquement les cartes fictives ci-dessous. Ne saisissez jamais une vraie carte.</p><ul>{Object.entries(mockCards).map(([brand, number]) => <li key={brand}>{brand} : <code>{number}</code> · réussite</li>)}<li>VISA : <code>{DECLINED_CARD}</code> · refus simulé</li></ul><p>Code fictif : 123. Date : un mois non expiré au format MM/AAAA (ex. 12/2035).</p></div>
    <form ref={form} action={action} className="auth-form" aria-busy={pending}><input type="hidden" name="intent" value="payment" /><input type="hidden" name="reviewId" value={reviewId} />{state.message && <p role="alert" className="field-error">{state.message}</p>}
      <div><label htmlFor={`${id}-brand`}>Réseau de la carte fictive</label><select id={`${id}-brand`} name="brand" defaultValue="VISA"><option value="CB">CB</option><option value="VISA">Visa</option><option value="MASTERCARD">Mastercard</option></select></div>
      {[["number", "Numéro de carte fictive", "4242 4242 4242 4242"], ["expiry", "Date d’expiration fictive (MM/AAAA)", "12/2035"], ["cvc", "Code de sécurité fictif", "123"]].map(([name, label, placeholder]) => <div key={name}><label htmlFor={`${id}-${name}`}>{label}</label><input id={`${id}-${name}`} name={name} placeholder={placeholder} autoComplete="off" inputMode={name === "expiry" ? "text" : "numeric"} required maxLength={name === "number" ? 23 : name === "expiry" ? 7 : 3} aria-invalid={Boolean(state.errors?.[name])} aria-describedby={state.errors?.[name] ? `${id}-${name}-error` : undefined} />{state.errors?.[name] && <p id={`${id}-${name}-error`} className="field-error">{state.errors[name].join(" ")}</p>}</div>)}
      <label className="checkout-check"><input type="checkbox" name="simulation" required aria-invalid={Boolean(state.errors?.simulation)} />Je confirme utiliser une carte fictive pour cette démonstration.</label>{state.errors?.simulation && <p className="field-error">{state.errors.simulation.join(" ")}</p>}
      <button className="cta" disabled={pending}>{pending ? "Validation…" : `Simuler le paiement de ${formatPrice(totalCents)}`}</button></form></>;
}
