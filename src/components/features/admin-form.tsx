"use client";
import { useActionState, useEffect, useId, useRef } from "react";
import { adminMutation } from "@/app/(admin)/admin/actions";
export type AdminField = { name: string; label: string; value?: string; type?: "text" | "textarea" | "checkbox" | "hidden" | "date"; options?: { value: string; label: string }[]; required?: boolean; help?: string };
export function AdminForm({ operation, id, fields = [], label, confirm = false }: { operation: string; id?: string; fields?: AdminField[]; label: string; confirm?: boolean }) {
  const [state, action, pending] = useActionState(adminMutation, { message: "" });
  const uid = useId(), ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.errors) ref.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); }, [state]);
  return <form ref={ref} action={action} className="auth-form admin-form" aria-busy={pending}>
    <input type="hidden" name="operation" value={operation} />{id && <input type="hidden" name="id" value={id} />}
    {state.message && <p role={state.success ? "status" : "alert"} className={state.success ? "form-help" : "field-error"}>{state.message}</p>}
    {fields.map(field => {
      const value = state.values?.[field.name] ?? field.value ?? "";
      if (field.type === "hidden") return <input key={field.name} type="hidden" name={field.name} value={field.value ?? ""} />;
      const invalid = Boolean(state.errors?.[field.name]), errorId = `${uid}-${field.name}-error`, helpId = `${uid}-${field.name}-help`;
      const common = { id: `${uid}-${field.name}`, name: field.name, required: field.required !== false, "aria-invalid": invalid, "aria-describedby": [field.help ? helpId : "", invalid ? errorId : ""].filter(Boolean).join(" ") || undefined };
      return <div key={field.name}>{field.type === "checkbox" ? <label className="simulation-check"><input {...common} type="checkbox" required={false} defaultChecked={value === "on"} />{field.label}</label> : <><label htmlFor={common.id}>{field.label}</label>{field.options ? <select {...common} defaultValue={value}>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : field.type === "textarea" ? <textarea {...common} defaultValue={value} rows={field.name === "description" ? 8 : 5} maxLength={field.name === "description" ? 20000 : 7000} /> : <input {...common} type={field.type === "date" ? "date" : "text"} defaultValue={value} maxLength={field.name === "stockReason" ? 300 : 1000} />}</>}
        {field.help && <p className="form-help" id={helpId}>{field.help}</p>}{invalid && <p className="field-error" id={errorId}>{state.errors?.[field.name]?.join(" ")}</p>}</div>;
    })}
    {confirm && <label className="simulation-check"><input type="checkbox" required />Confirmer cette opération</label>}
    <button className="cta" disabled={pending}>{pending ? "Enregistrement…" : label}</button>
  </form>;
}
