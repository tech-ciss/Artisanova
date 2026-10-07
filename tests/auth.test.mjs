import { test } from "node:test";
import assert from "node:assert/strict";
import { signupInput, loginInput } from "../src/lib/auth/validation.ts";
const valid = { firstName: "  Léa  ", lastName: "Martin", email: " LEA@EXAMPLE.TEST ", password: "Ma phrase 42", confirmation: "Ma phrase 42" };
test("inscription : normalisation email/noms, espaces du mot de passe conservés et rôle ignoré", () => {
  const result = signupInput.parse({ ...valid, role: "ADMIN" });
  assert.equal(result.email, "lea@example.test");
  assert.equal(result.firstName, "Léa");
  assert.equal(result.password, valid.password);
  assert.equal(Object.hasOwn(result, "role"), false);
});
test("inscription : règles de mot de passe, confirmation et limites bcrypt en octets", () => {
  for (const password of ["Abc123", "abcdefgh1", "Abcdefghi", `A1${"é".repeat(36)}`]) {
    assert.equal(signupInput.safeParse({ ...valid, password, confirmation: password }).success, false);
  }
  const password = `A1${"é".repeat(35)}`;
  assert.equal(signupInput.safeParse({ ...valid, password, confirmation: password }).success, true);
  assert.equal(signupInput.safeParse({ ...valid, confirmation: "différent" }).success, false);
  assert.equal(signupInput.safeParse({ ...valid, email: "absent", firstName: " " }).success, false);
});
test("connexion : formats invalides refusés sans imposer les nouvelles règles au mot de passe existant", () => {
  assert.equal(loginInput.safeParse({ email: "invalid", password: "" }).success, false);
  assert.equal(loginInput.safeParse({ email: valid.email, password: "legacy" }).success, true);
});
