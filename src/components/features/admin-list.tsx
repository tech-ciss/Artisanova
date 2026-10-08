import Link from "next/link";
import { adminFilters } from "@/lib/admin/validation";
export type AdminSearch = Record<string, string | string[] | undefined>;
export function parseAdminSearch(raw: AdminSearch) {
  const parsed = adminFilters.safeParse(raw);
  return { filters: parsed.success ? parsed.data : adminFilters.parse({}), invalid: !parsed.success };
}
export function AdminPagination({ page, pages, query }: { page: number; pages: number; query: { q: string; status: string; date: string } }) {
  const href = (next: number) => `?${new URLSearchParams({ ...query, page: String(next) })}`;
  return <nav className="account-nav" aria-label="Pagination">{page > 1 && <Link href={href(page - 1)}>Précédente</Link>}<span>Page {page} sur {pages}</span>{page < pages && <Link href={href(page + 1)}>Suivante</Link>}</nav>;
}
