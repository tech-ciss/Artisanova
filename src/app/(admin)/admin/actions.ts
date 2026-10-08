"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { idInput, type AdminState } from "@/lib/admin/validation";
import { AdminError, saveProduct, deleteProduct, saveCategory, deleteCategory, savePromo, transitionOrder } from "@/lib/services/admin.service";
import { simulateEmails } from "@/lib/services/email.service";
export async function adminMutation(_: AdminState, form: FormData): Promise<AdminState> {
  const actor = await requireAdmin();
  let destination: string | undefined;
  let message = "Modification enregistrée.";
  const values = Object.fromEntries([...form.entries()].filter(([key, value]) => !key.startsWith("$") && typeof value === "string").map(([key, value]) => [key, String(value).slice(0, 20000)]));
  for (const field of ["isFeatured", "isArchived", "isActive"]) values[field] = form.get(field) === "on" ? "on" : "";
  try {
    const operation = z.enum(["product", "product-delete", "category", "category-delete", "promo", "transition"]).parse(form.get("operation"));
    const id = form.get("id") ? idInput.parse(form.get("id")) : undefined;
    const db = getDatabase();
    if (operation === "product") {
      const imageText = z.string().max(7000).parse(form.get("images"));
      const images = imageText.split(/\r?\n/).filter(line => line.trim()).map(line => {
        const separator = line.indexOf(" | ");
        return { url: separator < 0 ? line.trim() : line.slice(0, separator).trim(), alt: separator < 0 ? "" : line.slice(separator + 3).trim() };
      });
      const product = await saveProduct(db, actor.id, { ...values, images, isFeatured: form.get("isFeatured") === "on" }, id);
      destination = `/admin/produits/${product.id}?saved=1`;
    } else if (operation === "product-delete") {
      message = await deleteProduct(db, actor.id, idInput.parse(id));
      destination = "/admin/produits?removed=1";
    } else if (operation === "category") await saveCategory(db, actor.id, { ...values, isArchived: form.get("isArchived") === "on" }, id);
    else if (operation === "category-delete") await deleteCategory(db, actor.id, idInput.parse(id));
    else if (operation === "promo") await savePromo(db, actor.id, { ...values, isActive: form.get("isActive") === "on" }, id);
    else {
      const order = await transitionOrder(db, actor.id, { id, from: form.get("from"), to: form.get("to") });
      try { await simulateEmails(db, order.id); } catch { console.warn("Email de commande en attente de simulation."); }
    }
  } catch (error) {
    if (error instanceof z.ZodError) return { message: "Vérifiez les champs indiqués.", errors: z.flattenError(error).fieldErrors as Record<string, string[]>, values };
    if (error instanceof AdminError) return { message: error.message, values };
    console.error("Admin mutation failed", error instanceof Error ? error.name : "unknown");
    return { message: "Modification indisponible. Rechargez et réessayez.", values };
  }
  revalidatePath("/", "layout");
  if (destination) redirect(destination);
  return { message, success: true };
}
