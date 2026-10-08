import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
export const metadata: Metadata = { title: "Espace client", robots: { index: false, follow: false } };
export default async function AccountLayout({children}:{children:React.ReactNode}) {
 await requireUser();
 return <><nav className="shop-main account-nav" aria-label="Espace client"><Link href="/compte">Mon compte</Link><Link href="/compte/adresses">Adresses</Link><Link href="/compte/profil">Profil</Link><Link href="/compte/commandes">Commandes</Link></nav>{children}</>;
}
