import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/commande", "/compte", "/connexion", "/inscription", "/panier", "/admin/", "/account/", "/checkout/", "/api/", "/auth/"] }, sitemap: `${siteOrigin()}/sitemap.xml` };
}
