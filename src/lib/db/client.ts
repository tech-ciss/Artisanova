import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";

/** Factory shared by CLI scripts and the server-only application entry point. */
export function createDatabaseClient(connectionString: string) {
  if (!connectionString.startsWith("postgresql://") && !connectionString.startsWith("postgres://")) {
    throw new Error("DATABASE_URL doit être une URL PostgreSQL.");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 5, connectionTimeoutMillis: 5000 }),
    log: ["error"],
  });
}
