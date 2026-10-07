import { z } from "zod";
const email = z.string().trim().toLowerCase().max(254, "Adresse email trop longue.").pipe(z.email("Saisissez une adresse email valide."));
const password = z.string().min(8, "Utilisez au moins 8 caractères.")
  .regex(/[A-ZÀ-ÖØ-Þ]/, "Ajoutez au moins une majuscule.")
  .regex(/[0-9]/, "Ajoutez au moins un chiffre.")
  .refine(value => new TextEncoder().encode(value).length <= 72, "Le mot de passe ne doit pas dépasser 72 octets (caractères accentués compris).");
const name = z.string().trim().min(1, "Ce champ est obligatoire.").max(80, "Utilisez au maximum 80 caractères.");
export const loginInput = z.object({ email, password: z.string().min(1, "Saisissez votre mot de passe.").refine(value => new TextEncoder().encode(value).length <= 72, "Mot de passe trop long.") });
export const signupInput = z.object({ email, password, firstName: name, lastName: name, confirmation: z.string() })
  .refine(value => value.password === value.confirmation, { path: ["confirmation"], message: "Les mots de passe doivent être identiques." });
export type AuthState = { message: string; errors?: Record<string, string[]>; values?: Record<string, string> };
