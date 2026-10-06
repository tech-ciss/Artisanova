import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Generate/build work without a database; runtime connections require DATABASE_URL.
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://localhost:5433/artisanova" },
});
