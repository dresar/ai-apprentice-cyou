#!/usr/bin/env node
/**
 * Tes koneksi Neon: DATABASE_URL dari .env (folder server).
 *   npm run db:test
 */
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL || "";
if (!databaseUrl) {
  console.error("DATABASE_URL belum di-set (server/.env)");
  process.exit(1);
}

const sql = neon(databaseUrl);
const rows = await sql`select 1 as ok, current_database() as db, current_user as role`;
console.log("Koneksi Neon OK:", rows[0]);
