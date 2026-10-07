import { z } from "zod";

export const PAGE_SIZE = 12;
export const catalogFiltersSchema = z.object({
  q: z.string().trim().max(120, "La recherche est limitée à 120 caractères.").default(""),
  category: z.union([z.literal(""), z.string({ error: "Choisissez une seule catégorie." }).max(100, "Catégorie trop longue.").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Catégorie invalide.")]).default(""),
  min: z.number().int().min(0).max(2147483647, "Ce prix dépasse la limite autorisée.").optional(),
  max: z.number().int().min(0).max(2147483647, "Ce prix dépasse la limite autorisée.").optional(),
  available: z.boolean().default(false),
  sort: z.enum(["newest", "price-asc", "price-desc", "popular"], { error: "Choisissez un tri proposé dans la liste." }).default("newest"),
  page: z.number().int().min(1).max(10000, "Numéro de page trop élevé.").default(1),
}).refine(value => value.min === undefined || value.max === undefined || value.min <= value.max, {
  message: "Le prix maximum doit être supérieur ou égal au minimum.", path: ["max"],
});
export type CatalogFilters = z.infer<typeof catalogFiltersSchema>;
export type SearchParameters = Record<string, string | string[] | undefined>;

const empty = (value: unknown) => value === "" ? undefined : value;
const price = z.preprocess(empty, z.string({ error: "Saisissez un seul prix." }).regex(/^\d{1,8}(?:[.,]\d{1,2})?$/, "Saisissez un prix positif avec deux décimales maximum.").transform(value => {
  const [whole, decimal = ""] = value.replace(",", ".").split(".");
  return Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
}).optional());
const urlSchema = z.object({
  q: z.preprocess(empty, z.string({ error: "Saisissez une seule valeur pour ce filtre." }).optional()),
  category: z.preprocess(empty, z.string({ error: "Saisissez une seule valeur pour ce filtre." }).optional()),
  min: price, max: price,
  available: z.preprocess(empty, z.literal("1", { error: "Choisissez une disponibilité valide." }).optional()).transform(value => value === "1"),
  sort: z.preprocess(empty, z.string({ error: "Saisissez une seule valeur pour ce filtre." }).optional()),
  page: z.preprocess(empty, z.string({ error: "Saisissez un seul numéro de page." }).regex(/^[1-9]\d*$/, "Page invalide.").transform(Number).optional()),
}).transform((value, context) => {
  const checked = catalogFiltersSchema.safeParse(value);
  if (!checked.success) {
    for (const issue of checked.error.issues) context.addIssue({ code: "custom", path: issue.path, message: issue.message });
    return z.NEVER;
  }
  return checked.data;
});

export function parseCatalogParameters(parameters: SearchParameters) {
  return urlSchema.safeParse(parameters);
}

export function catalogUrl(filters: CatalogFilters, page = filters.page) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.min !== undefined) params.set("min", (filters.min / 100).toFixed(2));
  if (filters.max !== undefined) params.set("max", (filters.max / 100).toFixed(2));
  if (filters.available) params.set("available", "1");
  if (filters.sort !== "newest") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  return `/catalogue${params.size ? `?${params}` : ""}`;
}
