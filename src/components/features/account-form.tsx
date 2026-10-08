"use client";
import { useActionState, useEffect, useId, useRef } from "react";
import { accountMutation } from "@/app/(shop)/compte/actions";
type Field = { name: string; label: string; value?: string; type?: string; autoComplete?: string; required?: boolean };
export function AccountForm({ intent, fields = [], id, label, address = false, addressType = "SHIPPING" }: { intent: "address" | "delete" | "profile" | "password"; fields?: Field[]; id?: string; label: string; address?: boolean; addressType?: string }) {
 const [state,action,pending]=useActionState(accountMutation,{message:""});
 const uid=useId(),form=useRef<HTMLFormElement>(null);
 useEffect(()=>{if(state.errors)form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();},[state]);
 return <form ref={form} action={action} className="auth-form" aria-busy={pending}><input type="hidden" name="intent" value={intent}/>{id&&<input type="hidden" name="id" value={id}/>}
 {state.message&&<p role={state.success?"status":"alert"} className={state.success?"form-help":"field-error"}>{state.message}</p>}
 {fields.map(field=><div key={field.name}><label htmlFor={`${uid}-${field.name}`}>{field.label}</label><input id={`${uid}-${field.name}`} name={field.name} type={field.type??"text"} defaultValue={field.value} autoComplete={field.autoComplete??"off"} required={field.required!==false} maxLength={field.type==="password"?72:field.name==="email"?254:field.name==="zip"?5:100} inputMode={field.name==="zip"?"numeric":undefined} aria-invalid={Boolean(state.errors?.[field.name])} aria-describedby={state.errors?.[field.name]?`${uid}-${field.name}-error`:undefined}/>{state.errors?.[field.name]&&<p className="field-error" id={`${uid}-${field.name}-error`}>{state.errors[field.name].join(" ")}</p>}</div>)}
 {address&&<><input type="hidden" name="country" value="FR"/><label htmlFor={`${uid}-type`}>Usage de l’adresse</label><select id={`${uid}-type`} name="type" defaultValue={addressType}><option value="SHIPPING">Livraison</option><option value="BILLING">Facturation</option></select><label className="simulation-check"><input type="checkbox" name="isDefault"/> Utiliser par défaut pour cet usage</label><p className="form-help">La première adresse devient automatiquement celle par défaut. Pour changer le défaut, choisissez une autre adresse du même usage.</p></>}
 {intent==="delete"&&<label className="simulation-check"><input type="checkbox" required/> Confirmer la suppression de cette adresse</label>}
 <button className="cta" disabled={pending}>{pending?"Enregistrement…":label}</button></form>;
}
