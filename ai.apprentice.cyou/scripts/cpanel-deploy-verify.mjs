#!/usr/bin/env node
/**
 * Verifikasi setelah deploy di cPanel (SSH dari folder server):
 *   node scripts/cpanel-deploy-verify.mjs https://api.domain-anda.com
 */
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const arg = process.argv[2];
const base = (arg && arg.startsWith("http") ? arg : process.env.API_BASE_URL || "").replace(/\/$/, "");
if (!base) {
  console.error("Pemakaian:");
  console.error("  node scripts/cpanel-deploy-verify.mjs https://api.domain-anda.com");
  console.error("  API_BASE_URL=https://api.domain-anda.com node scripts/cpanel-deploy-verify.mjs");
  process.exit(1);
}

async function quickCheck() {
  console.log("— Langkah 1: cek cepat (server hidup?)\n");
  let allOk = true;
  for (const path of ["/ping", "/healthz"]) {
    const url = `${base}${path}`;
    try {
      const r = await fetch(url, { redirect: "follow" });
      const mark = r.ok ? "OK" : "XX";
      console.log(`  ${mark} ${r.status}  GET ${path}`);
      if (!r.ok) allOk = false;
      if (path === "/healthz" && r.ok) {
        try {
          const j = await r.json();
          if (j.dbOk === false) {
            console.log("  (peringatan: dbOk false — cek DATABASE_URL)");
            allOk = false;
          }
        } catch {
          /* */
        }
      }
    } catch (e) {
      console.log(`  XX ERR  GET ${path}`);
      console.error(`      ${String(e.message || e)}`);
      allOk = false;
    }
  }
  return allOk;
}

const ok = await quickCheck();
if (!ok) {
  console.log("\nCek cepat gagal — perbaiki URL / deploy / reverse proxy.\n");
  process.exit(1);
}

console.log("\n— Langkah 2: audit endpoint lengkap —\n");

const serverDir = dirname(dirname(fileURLToPath(import.meta.url)));
const r = spawnSync(process.execPath, ["scripts/smoke-production-audit.mjs"], {
  cwd: serverDir,
  stdio: "inherit",
  env: { ...process.env, API_BASE_URL: base },
});
process.exit(r.status ?? 1);