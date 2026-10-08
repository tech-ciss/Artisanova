import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
export const metadata: Metadata = { title: "Administration", robots: { index: false, follow: false } };
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <><header className="admin-header"><Link className="wordmark" href="/admin">artisanova · administration</Link><nav className="account-nav" aria-label="Administration"><Link href="/admin">Tableau de bord</Link><Link href="/admin/produits">Produits</Link><Link href="/admin/categories">Catégories</Link><Link href="/admin/commandes">Commandes</Link><Link href="/admin/promotions">Promotions</Link><Link href="/admin/emails">Emails</Link><Link href="/compte">Mon compte</Link><Link href="/">Boutique</Link></nav></header>{children}</>;
}
