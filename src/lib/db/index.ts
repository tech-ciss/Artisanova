import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { createDatabaseClient } from "./client";

const globalForDatabase = globalThis as unknown as {
  artisanovaDb?: ReturnType<typeof createDatabaseClient>;
  artisanovaDbShape?: string;
};
// Generated public enums change when models/columns are added or removed.
// A running Next dev process must not reuse a client from an older schema.
const namespace = Prisma as unknown as Record<string, unknown>;
const clientShape = JSON.stringify(Object.values(Prisma.ModelName).sort().map(model => [model, Object.keys(namespace[`${model}ScalarFieldEnum`] as object).sort()]));

/** Lazy connection: static pages can build without a running database. */
export function getDatabase() {
  if (globalForDatabase.artisanovaDb && globalForDatabase.artisanovaDbShape === clientShape) return globalForDatabase.artisanovaDb;
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL manquante. Exécutez npm run setup.");
  const previous = globalForDatabase.artisanovaDb;
  const client = createDatabaseClient(process.env.DATABASE_URL);
  globalForDatabase.artisanovaDb = client;
  globalForDatabase.artisanovaDbShape = clientShape;
  if (previous) void previous.$disconnect().catch(() => console.warn("Previous database client could not be closed."));
  return client;
}
