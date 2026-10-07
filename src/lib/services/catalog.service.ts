import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import { normalizeSearch } from "../catalog/normalize";
import { catalogFiltersSchema, PAGE_SIZE, type CatalogFilters } from "../validations/catalog";

const cardSelect = {
  id: true, title: true, slug: true, description: true, priceCents: true, stock: true,
  category: { select: { id: true, name: true, slug: true } },
  artisan: { select: { name: true } },
  images: { orderBy: { position: "asc" as const }, take: 1, select: { id: true, url: true, alt: true } },
} satisfies Prisma.ProductSelect;
export type CatalogProduct = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;
const published = { status: "PUBLISHED" as const, category: { isArchived: false } };

function filterSql(filters: CatalogFilters) {
  const clauses = [Prisma.sql`p."status" = 'PUBLISHED'`, Prisma.sql`c."isArchived" = false`];
  if (filters.category) clauses.push(Prisma.sql`c."slug" = ${filters.category}`);
  if (filters.min !== undefined) clauses.push(Prisma.sql`p."priceCents" >= ${filters.min}`);
  if (filters.max !== undefined) clauses.push(Prisma.sql`p."priceCents" <= ${filters.max}`);
  if (filters.available) clauses.push(Prisma.sql`p."stock" > 0`);
  for (const term of normalizeSearch(filters.q).split(" ").filter(Boolean)) {
    const pattern = `%${term.replace(/[\\%_]/g, "\\$&")}%`;
    clauses.push(Prisma.sql`p."searchText" LIKE ${pattern}`);
  }
  return Prisma.join(clauses, " AND ");
}

/** All SQL values are bound parameters; ordering uses fixed, server-owned fragments. */
export async function listCatalog(db: PrismaClient, input: CatalogFilters) {
  const filters = catalogFiltersSchema.parse(input);
  const where = filterSql(filters);
  return db.$transaction(async tx => {
    const [count] = await tx.$queryRaw<{ total: number }[]>(Prisma.sql`SELECT count(*)::integer AS total FROM products p JOIN categories c ON c.id = p."categoryId" WHERE ${where}`);
    const total = count.total;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(filters.page, pages);
    const order = {
      newest: Prisma.sql`p."createdAt" DESC, p.id ASC`,
      "price-asc": Prisma.sql`p."priceCents" ASC, p.id ASC`,
      "price-desc": Prisma.sql`p."priceCents" DESC, p.id ASC`,
      popular: Prisma.sql`coalesce(sales.quantity, 0) DESC, p."createdAt" DESC, p.id ASC`,
    }[filters.sort];
    const sales = filters.sort === "popular" ? Prisma.sql`LEFT JOIN (
      SELECT oi."productId", sum(oi.quantity) AS quantity FROM order_items oi JOIN orders o ON o.id = oi."orderId"
      WHERE o.status IN ('PAID', 'PREPARING', 'SHIPPED', 'DELIVERED') GROUP BY oi."productId"
    ) sales ON sales."productId" = p.id` : Prisma.empty;
    const ids = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT p.id FROM products p JOIN categories c ON c.id = p."categoryId" ${sales} WHERE ${where} ORDER BY ${order} LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`);
    const rows = await tx.product.findMany({ where: { id: { in: ids.map(row => row.id) } }, select: cardSelect });
    const byId = new Map(rows.map(row => [row.id, row]));
    return { products: ids.map(row => byId.get(row.id)!), total, page, pages };
  }, { isolationLevel: "RepeatableRead" });
}

export async function catalogNavigation(db: PrismaClient) {
  const [categories, prices] = await Promise.all([
    db.category.findMany({ where: { isArchived: false }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, image: true, description: true } }),
    db.product.aggregate({ where: published, _max: { priceCents: true } }),
  ]);
  return { categories, ceilingCents: prices._max.priceCents ?? 0 };
}

export function featuredProducts(db: PrismaClient) {
  return db.product.findMany({ where: { ...published, isFeatured: true }, select: cardSelect, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 6 });
}

export function productBySlug(db: PrismaClient, slug: string) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160) return Promise.resolve(null);
  return db.product.findFirst({ where: { ...published, slug }, include: {
    images: { orderBy: { position: "asc" } }, category: true, artisan: true,
  } });
}

export function similarProducts(db: PrismaClient, productId: string, categoryId: string) {
  return db.product.findMany({ where: { ...published, categoryId, id: { not: productId } }, select: cardSelect, take: 4, orderBy: [{ stock: "desc" }, { id: "asc" }] });
}
