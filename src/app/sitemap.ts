import type { MetadataRoute } from "next";
import { getDatabase } from "@/lib/db";
import { siteOrigin } from "@/lib/site";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await getDatabase().product.findMany({
    where: { status: "PUBLISHED", category: { isArchived: false } }, select: { slug: true, updatedAt: true }, orderBy: { slug: "asc" },
  });
  const origin = siteOrigin();
  return [{ url: origin }, { url: `${origin}/catalogue` }, ...products.map(product => ({ url: `${origin}/produits/${product.slug}`, lastModified: product.updatedAt }))];
}
