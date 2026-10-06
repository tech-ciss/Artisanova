/** Shared between stored catalogue search text and incoming queries. */
export function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/œ/g, "oe").replace(/Œ/g, "OE").toLocaleLowerCase("fr").replace(/\s+/g, " ").trim();
}
