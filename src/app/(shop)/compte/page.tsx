import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { SignOutForm } from "@/components/features/auth-form";
export const metadata: Metadata = { title: "Mon compte", robots: { index: false, follow: false } };
export default async function AccountPage() {
  const user = await requireUser();
  return <main id="contenu" tabIndex={-1} className="shop-main auth-page"><p className="eyebrow">VOTRE ESPACE</p><h1 className="page-title">Bonjour {user.firstName}.</h1><p>Vous êtes connecté avec <strong>{user.email}</strong>.</p><p>Votre panier est enregistré dans votre compte et conservé après déconnexion.</p><Link className="cta" href="/panier">Retrouver mon panier</Link><p className="demo-note">Retrouvez vos adresses, votre profil et vos commandes dans le menu de votre espace.</p><SignOutForm /></main>;
}
