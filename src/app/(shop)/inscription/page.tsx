import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth/session";
import { AuthForm } from "@/components/features/auth-form";
export const metadata: Metadata = { title: "Créer un compte", robots: { index: false, follow: false } };
export default async function SignupPage() {
  if (await currentUser()) redirect("/compte");
  return <main id="contenu" tabIndex={-1} className="shop-main auth-page"><p className="eyebrow">BIENVENUE CHEZ ARTISANOVA</p><h1 className="page-title">Créer mon compte</h1><p>Conservez votre panier et retrouvez-le lors de votre prochaine visite.</p><AuthForm mode="signup" /><p>Déjà un compte ? <Link className="quiet-link" href="/connexion">Me connecter</Link></p><p className="demo-note">Projet de démonstration : utilisez des coordonnées fictives et un mot de passe réservé à ce projet.</p></main>;
}
