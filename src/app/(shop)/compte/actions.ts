"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser, AUTH_COOKIE } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { AccountError, saveAddress, deleteAddress, updateProfile } from "@/lib/services/account.service";
import type { AccountState } from "@/lib/account/validation";
const identifier = z.string().min(1).max(100);
export async function accountMutation(_: AccountState, form: FormData): Promise<AccountState> {
 const user = await requireUser();
 let logout = false;
 try {
  const intent = z.enum(["address", "delete", "profile", "password"]).parse(form.get("intent"));
  const raw = Object.fromEntries(form);
  if(intent === "address") await saveAddress(getDatabase(),user.id,{...raw,isDefault:form.get("isDefault")==="on"},form.get("id") ? identifier.parse(form.get("id")) : undefined);
  else if(intent === "delete") await deleteAddress(getDatabase(),user.id,identifier.parse(form.get("id")));
  else logout=await updateProfile(getDatabase(),user.id,raw,intent === "password");
 } catch(error) {
  if(error instanceof z.ZodError) return {message:"Vérifiez les champs indiqués.",errors:z.flattenError(error).fieldErrors as Record<string,string[]>};
  if(error instanceof AccountError) return {message:error.message};
  console.error("Account mutation failed",error instanceof Error ? error.name : "unknown");
  return {message:"Modification indisponible. Réessayez."};
 }
 revalidatePath("/", "layout");
 if(logout) { (await cookies()).delete(AUTH_COOKIE); redirect("/connexion"); }
 return {message:"Modification enregistrée.",success:true};
}
