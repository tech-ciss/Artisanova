import { test } from "node:test";
import assert from "node:assert/strict";
import { deliveryInput, deliveryData, paymentInput, mockCards, DECLINED_CARD, orderDay } from "../src/lib/checkout/validation.ts";
const delivery = { email: " DEMO@EXAMPLE.TEST ", firstName: "Test", lastName: "Demo", line1: "1 rue Fictive", line2: "", city: "Nantes", zip: "44000", country: "FR", shippingMethod: "STANDARD" };
test("livraison : normalisation, France, facturation complète et point relais fictif", () => {
  assert.equal(deliveryData(delivery).email, "demo@example.test");
  assert.deepEqual(deliveryData(delivery).billing, deliveryData(delivery).shipping);
  assert.equal(deliveryInput.safeParse({ ...delivery, country: "US" }).success, false);
  assert.equal(deliveryInput.safeParse({ ...delivery, zip: "00000" }).success, false);
  assert.equal(deliveryInput.safeParse({ ...delivery, billingCity: "Paris" }).success, false);
  assert.equal(deliveryInput.safeParse({ ...delivery, shippingMethod: "RELAY" }).success, false);
  const relay = deliveryData({ ...delivery, shippingMethod: "RELAY", relayPoint: "PARIS" });
  assert.equal(relay.shipping.zip, "75001");
  assert.equal(relay.billing.zip, "44000");
});
test("paiement : seules les fixtures CB/Visa/Mastercard autorisées, expiration et consentement contrôlés", () => {
  const schema = paymentInput(new Date("2026-10-07T12:00:00Z"));
  const base = { reviewId: "review-test", brand: "VISA", number: mockCards.VISA, expiry: "10/2026", cvc: "123", simulation: "on" };
  for (const [brand, number] of Object.entries(mockCards)) assert.equal(schema.safeParse({ ...base, brand, number }).success, true);
  assert.equal(schema.safeParse({ ...base, number: DECLINED_CARD }).success, true);
  for (const patch of [{ number: "1234567890123456" }, { number: mockCards.MASTERCARD }, { expiry: "09/2026" }, { expiry: "13/2030" }, { cvc: "999" }, { simulation: "off" }, { reviewId: "" }]) assert.equal(schema.safeParse({ ...base, ...patch }).success, false);
});
test("référence : journée métier Europe/Paris à la frontière UTC", () => {
  assert.equal(orderDay(new Date("2026-10-07T23:30:00Z")), "20261008");
});
