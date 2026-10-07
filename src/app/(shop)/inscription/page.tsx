import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { AuthForm } from "@/components/features/auth-form";
export const metadata: Metadata = { title: "Créer un compte", robots: { index: false, follow: false } };
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ commande?: string }> }) {
  const attachOrder = (await searchParams).commande === "1";
  if (await currentUser()) redirect("/compte");
  return <main id="contenu" tabIndex={-1} className="shop-main auth-page"><p className="eyebrow">BIENVENUE CHEZ ARTISANOVA</p><h1 className="page-title">Créer mon compte</h1><p>Conservez votre panier et retrouvez-le lors de votre prochaine visite.</p>{attachOrder && <p className="demo-note">Utilisez l’adresse email de votre commande pour la rattacher à votre compte.</p>}<AuthForm mode="signup" attachOrder={attachOrder} /><p>Déjà un compte ? <Link className="quiet-link" href="/connexion">Me connecter</Link></p><p className="demo-note">Projet de démonstration : utilisez des coordonnées fictives et un mot de passe réservé à ce projet.</p></main>;
}
