#!/usr/bin/env node
/**
 * Jalankan sekali per environment (Neon / Postgres kompatibel dengan driver Neon).
 * Dari folder server: DATABASE_URL="postgresql://..." npm run db:bootstrap
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL || "";
if (!databaseUrl) {
  console.error("DATABASE_URL belum diisi di .env");
  process.exit(1);
}

const sql = neon(databaseUrl);
const serverDir = dirname(dirname(fileURLToPath(import.meta.url)));
const sqlPath = resolve(serverDir, "sql/bootstrap-core.sql");
const script = readFileSync(sqlPath, "utf8");

const statements = script
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
}

console.log(`Bootstrap selesai: ${statements.length} statements dieksekusi.`);
