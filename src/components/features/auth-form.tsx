"use client";
import { useActionState, useEffect, useId, useRef, useState } from "react";
import { signIn, signUp, signOut } from "@/app/(shop)/connexion/actions";
import type { AuthState } from "@/lib/auth/validation";
const initial: AuthState = { message: "" };
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? signIn : signUp, initial);
  const [visible, setVisible] = useState(false);
  const id = useId();
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.errors) form.current?.querySelector<HTMLInputElement>('input[aria-invalid="true"]')?.focus(); }, [state]);
  const fields = mode === "signup" ? ["firstName", "lastName", "email", "password", "confirmation"] : ["email", "password"];
  const labels: Record<string, string> = { firstName: "Prénom", lastName: "Nom", email: "Adresse email", password: "Mot de passe", confirmation: "Confirmer le mot de passe" };
  const autocomplete: Record<string, string> = { firstName: "given-name", lastName: "family-name", email: "email", password: mode === "signup" ? "new-password" : "current-password", confirmation: "new-password" };
  return <form ref={form} action={action} className="auth-form" aria-busy={pending}>
    <input name="intent" type="hidden" value={mode} />
    {state.message && <p role="alert" className="field-error">{state.message}</p>}
    {fields.map(field => <div key={field}><label htmlFor={`${id}-${field}`}>{labels[field]}</label><input id={`${id}-${field}`} name={field} defaultValue={field !== "password" && field !== "confirmation" ? state.values?.[field] : undefined} type={field === "email" ? "email" : field === "password" || field === "confirmation" ? visible ? "text" : "password" : "text"} autoComplete={autocomplete[field]} required maxLength={field === "email" ? 254 : field === "password" || field === "confirmation" ? 72 : 80} minLength={mode === "signup" && (field === "password" || field === "confirmation") ? 8 : undefined} aria-invalid={Boolean(state.errors?.[field]?.length)} aria-describedby={[state.errors?.[field]?.length ? `${id}-${field}-error` : "", mode === "signup" && field === "password" ? `${id}-password-help` : ""].filter(Boolean).join(" ") || undefined} />{state.errors?.[field]?.length ? <p id={`${id}-${field}-error`} className="field-error">{state.errors[field].join(" ")}</p> : null}</div>)}
    {mode === "signup" && <p id={`${id}-password-help`} className="form-help">Au moins 8 caractères, une majuscule et un chiffre. Maximum 72 octets ; les accents comptent pour plusieurs octets. Le mot de passe conserve ses espaces.</p>}
    <button className="quiet-link password-toggle" type="button" aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? "Masquer" : "Afficher"} le mot de passe</button>
    <button className="cta" disabled={pending}>{pending ? "Vérification…" : mode === "login" ? "Me connecter" : "Créer mon compte"}</button>
  </form>;
}
export function SignOutForm() {
  const [state, action, pending] = useActionState(signOut, initial);
  return <form action={action}><input type="hidden" name="intent" value="logout" /><button className="cta" disabled={pending}>{pending ? "Déconnexion…" : "Me déconnecter"}</button>{state.message && <p role="alert" className="field-error">{state.message}</p>}</form>;
}
