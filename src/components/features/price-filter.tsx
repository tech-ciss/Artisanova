"use client";
import { useState } from "react";
import { formatPrice } from "@/lib/catalog/format";
export function PriceFilter({ min, max, ceilingCents, errors = {} }: { min?: number; max?: number; ceilingCents: number; errors?: Record<string, string> }) {
  const [maximum, setMaximum] = useState(max === undefined ? "" : (max / 100).toFixed(2));
  const ceiling = Math.max(1, ceilingCents / 100, max === undefined ? 0 : max / 100);
  return <fieldset><legend>Budget TTC</legend><div className="price-inputs">
    <label htmlFor="min-price">Minimum (€)<input id="min-price" name="min" type="number" min="0" step="0.01" aria-invalid={!!errors.min} aria-describedby={errors.min ? "min-error" : undefined} defaultValue={min === undefined ? "" : (min / 100).toFixed(2)} placeholder="0" /></label>
    <label htmlFor="max-price">Maximum (€)<input id="max-price" name="max" type="number" min="0" step="0.01" aria-invalid={!!errors.max} aria-describedby={errors.max ? "max-error" : undefined} value={maximum} onChange={event => setMaximum(event.target.value)} placeholder="Sans limite" /></label>
  </div>{errors.min && <p className="field-error" id="min-error">{errors.min}</p>}{errors.max && <p className="field-error" id="max-error">{errors.max}</p>}<label htmlFor="price-slider">Budget maximum : {maximum === "" ? "sans limite" : formatPrice(Number(maximum) * 100)}</label>
    <input id="price-slider" type="range" min="0" max={ceiling} step="0.01" value={maximum === "" ? ceiling : Math.min(ceiling, Math.max(0, Number(maximum)))} onChange={event => setMaximum(event.target.value)} />
    <p className="field-hint">Le curseur couvre les prix du catalogue. Vous pouvez saisir un autre plafond.</p>
  </fieldset>;
}
