/** Calcul pur. Les données devront provenir du catalogue serveur lors du checkout. */
export type ShippingMethod = "STANDARD" | "RELAY" | "EXPRESS";
export type CartLine = { productId: string; unitPriceCents: number; quantity: number; stock: number };
export type Promotion = {
  type: "PERCENT" | "FIXED" | "FREE_SHIPPING";
  value: number;
  isActive: boolean;
  expiresAt?: Date;
  maxUses?: number;
  usedCount: number;
};

function integer(value: number, minimum: number, label: string) {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`${label} invalide`);
}

export function calculateCart(lines: readonly CartLine[], shipping: ShippingMethod = "STANDARD", promo?: Promotion, now = new Date()) {
  const rates = { STANDARD: 590, RELAY: 490, EXPRESS: 990 };
  if (!Object.hasOwn(rates, shipping)) throw new Error("Livraison invalide");
  const seen = new Set<string>();
  let subtotalCents = 0;
  for (const line of lines) {
    if (!line.productId || seen.has(line.productId)) throw new Error("Produit absent ou dupliqué");
    seen.add(line.productId);
    integer(line.unitPriceCents, 0, "Prix");
    integer(line.quantity, 1, "Quantité");
    integer(line.stock, 0, "Stock");
    if (line.quantity > line.stock) throw new Error("Stock insuffisant");
    subtotalCents += line.unitPriceCents * line.quantity;
    integer(subtotalCents, 0, "Sous-total");
  }
  let discountCents = 0;
  if (promo) {
    integer(promo.value, 0, "Remise");
    integer(promo.usedCount, 0, "Utilisations");
    if (promo.maxUses !== undefined) integer(promo.maxUses, 0, "Limite");
    if (!promo.isActive || (promo.expiresAt && (!Number.isFinite(promo.expiresAt.getTime()) || promo.expiresAt <= now)) || (promo.maxUses !== undefined && promo.usedCount >= promo.maxUses)) throw new Error("Code promotionnel indisponible");
    switch (promo.type) {
      case "PERCENT":
        if (promo.value > 100) throw new Error("Pourcentage invalide");
        discountCents = Math.round(subtotalCents * (promo.value / 100));
        break;
      case "FIXED": discountCents = Math.min(subtotalCents, promo.value); break;
      case "FREE_SHIPPING": break;
      default: throw new Error("Promotion invalide");
    }
  }
  const discountedSubtotalCents = subtotalCents - discountCents;
  const shippingCents = lines.length === 0 || discountedSubtotalCents >= 6000 || promo?.type === "FREE_SHIPPING" ? 0 : rates[shipping];
  const totalCents = discountedSubtotalCents + shippingCents;
  integer(totalCents, 0, "Total");
  return { subtotalCents, discountCents, shippingCents, totalCents };
}
