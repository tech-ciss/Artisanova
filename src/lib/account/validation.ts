import { z } from "zod";
import { addressSchema } from "@/lib/checkout/validation";
import { signupInput } from "@/lib/auth/validation";
export const accountAddressInput = addressSchema.extend({ type: z.enum(["SHIPPING", "BILLING"]), isDefault: z.boolean() });
export const profileInput = z.object({ firstName: signupInput.shape.firstName, lastName: signupInput.shape.lastName, email: signupInput.shape.email }).extend({ currentPassword: z.string().min(1, "Confirmez votre mot de passe actuel.").max(72) });
export const passwordInput = z.object({ password: signupInput.shape.password, confirmation: signupInput.shape.confirmation }).extend({ currentPassword: z.string().min(1).max(72) }).refine(value => value.password === value.confirmation, { path: ["confirmation"], message: "Les mots de passe doivent être identiques." });
export type AccountState = { message: string; errors?: Record<string, string[]>; success?: boolean };
