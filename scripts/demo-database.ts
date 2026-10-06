/** Guard shared by demo seed and integration checks; never prints credentials. */
export function requireDemoDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL manquante.");
  const target = new URL(connectionString);
  if (!["postgresql:", "postgres:"].includes(target.protocol) || process.env.NODE_ENV === "production" || process.env.SEED_DEMO !== "true" || !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || target.pathname !== "/artisanova") {
    throw new Error("Opération de démonstration refusée : utiliser SEED_DEMO=true et une base artisanova locale, hors production.");
  }
  return connectionString;
}
