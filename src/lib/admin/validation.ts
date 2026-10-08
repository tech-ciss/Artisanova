import { z } from "zod";
export const idInput = z.string().min(1).max(100);
const name = z.string().trim().min(1, "Champ obligatoire.").max(160);
const slug = z.string().max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Utilisez un slug avec lettres minuscules, chiffres et tirets.");
export const imageUrl = z.string().max(1000).refine(value => {
  if (/^\/(demo|images)\/[a-zA-Z0-9/_-]+\.(svg|png|jpg|jpeg|webp|avif)$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "images.unsplash.com" && !url.username && !url.password && !url.port; } catch { return false; }
}, "Image locale /demo ou /images, ou URL HTTPS images.unsplash.com attendue.");
export const moneyInput = z.string().regex(/^\d{1,7}(?:[.,]\d{1,2})?$/, "Saisissez un montant positif, avec au plus deux décimales.").transform(value => {
  const [whole, decimal = ""] = value.replace(",", ".").split(".");
  return Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
});
const integer = z.string().regex(/^\d{1,7}$/, "Saisissez un nombre entier positif ou nul.").transform(Number);
export const productInput = z.object({
  title: name, slug, description: z.string().trim().min(1).max(20000),
  price: moneyInput, vat: z.enum(["0", "2.1", "5.5", "10", "20"]).transform(value => Math.round(Number(value) * 100)),
  stock: integer, categoryId: idInput, artisanId: idInput, status: z.enum(["DRAFT", "PUBLISHED"]), isFeatured: z.boolean(),
  images: z.array(z.object({ url: imageUrl, alt: z.string().trim().min(1, "Texte alternatif obligatoire.").max(200) })).min(1, "Ajoutez au moins une image.").max(5, "Maximum cinq images."),
  stockReason: z.string().trim().max(300).default(""),
  expectedUpdatedAt: z.iso.datetime().optional(),
});
export const categoryInput = z.object({ name, slug, description: z.string().trim().max(5000), image: z.union([z.literal(""), imageUrl]), isArchived: z.boolean() });
export const promoInput = z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{1,40}$/, "Code : lettres, chiffres, tirets, 40 caractères maximum."), type: z.enum(["PERCENT", "FIXED", "FREE_SHIPPING"]), value: moneyInput, expiresAt: z.union([z.literal(""), z.iso.datetime()]), maxUses: z.union([z.literal(""), integer]), isActive: z.boolean() }).superRefine((value, ctx) => {
  if (value.type === "PERCENT" && (value.value < 100 || value.value > 10000 || value.value % 100 !== 0)) ctx.addIssue({ code: "custom", path: ["value"], message: "Pourcentage entier entre 1 et 100." });
  if (value.type === "FIXED" && value.value < 1) ctx.addIssue({ code: "custom", path: ["value"], message: "Remise supérieure à zéro." });
  if (value.type === "FREE_SHIPPING" && value.value !== 0) ctx.addIssue({ code: "custom", path: ["value"], message: "Utilisez 0 pour le port offert." });
  if (value.maxUses !== "" && value.maxUses < 1) ctx.addIssue({ code: "custom", path: ["maxUses"], message: "Minimum une utilisation." });
});
export const orderStatuses = ["PENDING_PAYMENT", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
export const transitionInput = z.object({ id: idInput, from: z.enum(orderStatuses), to: z.enum(orderStatuses) });
export const adminFilters = z.object({ page: z.string().regex(/^[1-9]\d{0,3}$/).default("1").transform(Number), q: z.string().trim().max(120).default(""), status: z.union([z.literal(""), z.enum(orderStatuses)]).default(""), date: z.union([z.literal(""), z.iso.date()]).default("") });
export type AdminState = { message: string; errors?: Record<string, string[]>; success?: boolean; values?: Record<string, string> };
