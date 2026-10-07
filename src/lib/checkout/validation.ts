import { z } from "zod";
const text = (label: string, max = 100) => z.string().trim().min(1, `${label} obligatoire.`).max(max, `${label} trop long.`);
export const addressSchema = z.object({ firstName: text("Prénom", 80), lastName: text("Nom", 80), line1: text("Adresse"), line2: z.string().trim().max(100).default(""), city: text("Ville", 80), zip: z.string().regex(/^\d{5}$/, "Saisissez un code postal français à 5 chiffres.").refine(value => value !== "00000", "Code postal invalide."), country: z.literal("FR", "Livraison en France uniquement.") });
export const shippingSchema = z.enum(["STANDARD", "RELAY", "EXPRESS"], "Choisissez un mode de livraison.");
export const relayPoints = {
  NANTES: { line1: "1 rue de Démonstration — Relais fictif", line2: "", city: "Nantes", zip: "44000", country: "FR" as const },
  PARIS: { line1: "2 rue de Démonstration — Relais fictif", line2: "", city: "Paris", zip: "75001", country: "FR" as const },
};
export const deliveryInput = addressSchema.extend({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email("Saisissez un email valide.")), shippingMethod: shippingSchema,
  relayPoint: z.enum(["", "NANTES", "PARIS"]).default(""),
  billingFirstName: z.string().default(""), billingLastName: z.string().default(""), billingLine1: z.string().default(""), billingLine2: z.string().default(""), billingCity: z.string().default(""), billingZip: z.string().default(""),
}).superRefine((value, context) => {
  if (value.shippingMethod === "RELAY" && !value.relayPoint) context.addIssue({ code: "custom", path: ["relayPoint"], message: "Choisissez un point relais de démonstration." });
  if ([value.billingFirstName, value.billingLastName, value.billingLine1, value.billingLine2, value.billingCity, value.billingZip].some(field => field.trim())) {
    const parsed = addressSchema.safeParse({ firstName: value.billingFirstName, lastName: value.billingLastName, line1: value.billingLine1, line2: value.billingLine2, city: value.billingCity, zip: value.billingZip, country: "FR" });
    if (!parsed.success) for (const issue of parsed.error.issues) context.addIssue({ code: "custom", path: [`billing${String(issue.path[0]).replace(/^./, char => char.toUpperCase())}`], message: issue.message });
  }
});
export const deliveryDataSchema = z.object({ email: z.email(), shippingMethod: shippingSchema, shipping: addressSchema, billing: addressSchema, relayPoint: z.string() });
export function deliveryData(raw: unknown) {
  const input = deliveryInput.parse(raw);
  const shipping = addressSchema.parse(input);
  const separate = [input.billingFirstName, input.billingLastName, input.billingLine1, input.billingLine2, input.billingCity, input.billingZip].some(value => value.trim());
  const billing = separate ? addressSchema.parse({ firstName: input.billingFirstName, lastName: input.billingLastName, line1: input.billingLine1, line2: input.billingLine2, city: input.billingCity, zip: input.billingZip, country: "FR" }) : shipping;
  return { email: input.email, shippingMethod: input.shippingMethod, shipping: input.shippingMethod === "RELAY" ? { ...shipping, ...relayPoints[input.relayPoint as keyof typeof relayPoints] } : shipping, billing, relayPoint: input.relayPoint };
}
export const mockCards = { CB: "4000000000000077", VISA: "4242424242424242", MASTERCARD: "5555555555554444" } as const;
export const DECLINED_CARD = "4000000000000002";
export function paymentInput(now = new Date()) {
  return z.object({ reviewId: z.string().min(1).max(100), brand: z.enum(["CB", "VISA", "MASTERCARD"]), number: z.string().transform(value => value.replaceAll(" ", "")), expiry: z.string().regex(/^(0[1-9]|1[0-2])\/\d{4}$/, "Format attendu : MM/AAAA."), cvc: z.literal("123", "Utilisez le code fictif 123."), simulation: z.literal("on", "Confirmez qu’il s’agit d’un paiement fictif.") }).superRefine((value, context) => {
    if (value.number !== mockCards[value.brand] && !(value.brand === "VISA" && value.number === DECLINED_CARD)) context.addIssue({ code: "custom", path: ["number"], message: "Utilisez uniquement une carte fictive indiquée ci-dessous." });
    const [month, year] = value.expiry.split("/").map(Number);
    if (year < now.getUTCFullYear() || (year === now.getUTCFullYear() && month < now.getUTCMonth() + 1)) context.addIssue({ code: "custom", path: ["expiry"], message: "La carte fictive est expirée." });
  });
}
export type CheckoutState = { message: string; errors?: Record<string, string[]>; values?: Record<string, string> };
export function orderDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)!.value).join("");
}
