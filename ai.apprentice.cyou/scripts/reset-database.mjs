#!/usr/bin/env node
/**
 * Hapus semua objek di schema public (reset penuh), lalu jalankan bootstrap schema.
 * PERINGATAN: menghapus semua data. DATABASE_URL dari server/.env
 *   npm run db:reset
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const databaseUrl = process.env.DATABASE_URL || "";
if (!databaseUrl) {
  console.error("DATABASE_URL belum di-set (server/.env)");
  process.exit(1);
}

const sql = neon(databaseUrl);
const serverDir = dirname(dirname(fileURLToPath(import.meta.url)));

console.log("Menjalankan DROP SCHEMA public CASCADE …");
await sql.query("DROP SCHEMA IF EXISTS public CASCADE");

console.log("Membuat ulang schema public …");
await sql.query("CREATE SCHEMA public");
await sql.query("GRANT ALL ON SCHEMA public TO public");
await sql.query("GRANT ALL ON SCHEMA public TO neon_superuser");

console.log("Menjalankan bootstrap schema …");
const r = spawnSync(process.execPath, ["scripts/bootstrap-schema.mjs"], {
  cwd: serverDir,
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);
