import "server-only";
import { createDatabaseClient } from "./client";

const globalForDatabase = globalThis as unknown as {
  artisanovaDb?: ReturnType<typeof createDatabaseClient>;
};

/** Lazy connection: static pages can build without a running database. */
export function getDatabase() {
  if (globalForDatabase.artisanovaDb) return globalForDatabase.artisanovaDb;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquante. Exécutez npm run setup.");
  const client = createDatabaseClient(process.env.DATABASE_URL);
  globalForDatabase.artisanovaDb = client;
  return client;
}
