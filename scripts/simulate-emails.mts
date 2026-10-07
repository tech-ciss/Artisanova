import "dotenv/config";
import { createDatabaseClient } from "../src/lib/db/client";
import { requireDemoDatabase } from "./demo-database";
import { simulateEmails } from "../src/lib/services/email.service";
const db = createDatabaseClient(requireDemoDatabase());
try { console.info(`${await simulateEmails(db)} email(s) simulé(s).`); }
finally { await db.$disconnect(); }
