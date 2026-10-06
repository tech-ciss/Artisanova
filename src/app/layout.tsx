import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Artisanova — Des objets, des histoires", template: "%s | Artisanova" },
  description: "Découvrez les créations artisanales françaises : céramiques, bougies, bijoux, textiles et soins naturels.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body><a className="skip-link" href="#contenu">Aller au contenu</a>{children}</body></html>;
}
