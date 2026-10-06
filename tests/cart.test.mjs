import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateCart } from "../src/lib/services/cart.service.ts";
const line = (price = 2000, quantity = 1, stock = 5) => ({ productId: "demo", unitPriceCents: price, quantity, stock });
const promo = (type, value, rest = {}) => ({ type, value, isActive: true, usedCount: 0, ...rest });

test("panier vide sans frais", () => assert.deepEqual(calculateCart([]), { subtotalCents: 0, discountCents: 0, shippingCents: 0, totalCents: 0 }));
test("sous-total et trois tarifs de livraison", () => {
  for (const [method, cost] of [["STANDARD",590],["RELAY",490],["EXPRESS",990]]) assert.equal(calculateCart([line(2000,2)], method).totalCents, 4000 + cost);
});
test("seuil gratuit exact, pour toutes les livraisons", () => {
  for (const method of ["STANDARD","RELAY","EXPRESS"]) {
    assert.equal(calculateCart([line(5999)], method).shippingCents > 0, true);
    assert.equal(calculateCart([line(6000)], method).shippingCents, 0);
  }
});
test("pourcentage arrondi au centime et seuil après remise", () => {
  assert.equal(calculateCart([line(999)], "STANDARD", promo("PERCENT",10)).discountCents, 100);
  assert.equal(calculateCart([line(6000)], "STANDARD", promo("PERCENT",10)).totalCents, 5990);
});
test("remise fixe plafonnée et PORT0", () => {
  assert.equal(calculateCart([line()], "STANDARD", promo("FIXED",5000)).discountCents,2000);
  assert.equal(calculateCart([line()], "EXPRESS", promo("FREE_SHIPPING",0)).totalCents,2000);
});
test("promotions inactives, expirées ou épuisées refusées", () => {
  for (const extra of [{isActive:false},{expiresAt:new Date("2026-01-01")},{maxUses:1,usedCount:1},{maxUses:-1},{expiresAt:new Date("invalid")}]) assert.throws(() => calculateCart([line()],"STANDARD",promo("PERCENT",10,extra),new Date("2026-10-06")));
});
test("prix, quantités, stock et doublons invalides refusés", () => {
  for (const invalid of [line(-1),line(1,0),line(1,1.5),line(1,6),line(NaN),line(Number.MAX_SAFE_INTEGER,2)]) assert.throws(() => calculateCart([invalid]));
  assert.throws(() => calculateCart([line(),line()]));
  assert.throws(() => calculateCart([line()],"INVALID"));
  assert.throws(() => calculateCart([line()],"STANDARD",promo("PERCENT",101)));
});
