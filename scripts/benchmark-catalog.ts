import "dotenv/config";
import { createDatabaseClient } from "../src/lib/db/client";
import { requireDemoDatabase } from "./demo-database";
import { listCatalog } from "../src/lib/services/catalog.service";
import { catalogFiltersSchema } from "../src/lib/validations/catalog";
const db = createDatabaseClient(requireDemoDatabase());
try {
  const filters = catalogFiltersSchema.parse({ q: "GRÈS", available: true });
  await listCatalog(db, filters);
  const durations: number[] = [];
  for (let iteration = 0; iteration < 20; iteration++) {
    const start = performance.now();
    await listCatalog(db, filters);
    durations.push(performance.now() - start);
  }
  durations.sort((a, b) => a - b);
  console.info(JSON.stringify({ samples: 20, products: await db.product.count(), medianMs: Number(durations[9].toFixed(2)), p95Ms: Number(durations[18].toFixed(2)), maxMs: Number(durations[19].toFixed(2)), scope: "Service PostgreSQL local après échauffement ; hors réseau, rendu et navigateur" }));
} finally { await db.$disconnect(); }
