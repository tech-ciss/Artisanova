import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { AuthForm } from "@/components/features/auth-form";
export const metadata: Metadata = { title: "Connexion", robots: { index: false, follow: false } };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ deconnexion?: string }> }) {
  const notice = (await searchParams).deconnexion === "1";
  if (await currentUser()) redirect("/compte");
  return <main id="contenu" tabIndex={-1} className="shop-main auth-page"><p className="eyebrow">HEUREUX DE VOUS RETROUVER</p><h1 className="page-title">Me connecter</h1><p>Retrouvez votre panier sur vos appareils. Vos créations choisies en invité seront ajoutées à celles de votre compte.</p>{notice && <p role="status" className="stock-available">Vous êtes déconnecté. Votre panier de compte est conservé.</p>}<AuthForm mode="login" /><p>Première visite ? <Link className="quiet-link" href="/inscription">Créer un compte</Link></p><p className="demo-note">Le compte est facultatif pour découvrir la boutique. La commande en invité sera proposée à l’étape paiement.</p><Link className="quiet-link" href="/catalogue">Continuer sans compte →</Link></main>;
}
