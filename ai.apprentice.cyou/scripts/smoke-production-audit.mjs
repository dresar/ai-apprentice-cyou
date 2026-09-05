#!/usr/bin/env node
/**
 * Audit endpoint untuk mode production (cPanel): publik + register + login + rute terautentikasi.
 *   API_BASE_URL=http://127.0.0.1:8788 node scripts/smoke-production-audit.mjs
 */
import "dotenv/config";

const base = (process.env.API_BASE_URL || "http://127.0.0.1:8788").replace(/\/$/, "");
const email =
  process.env.SMOKE_EMAIL || `smoke-prod-${Date.now()}@audit.local`;
const password = process.env.SMOKE_PASSWORD || "SmokeAuditProd123!";

const results = [];

async function req(method, path, { headers = {}, body, expect = [], label } = {}) {
  const url = path.startsWith("http") ? path : `${base}${path}`;
  const name = label || `${method} ${path}`;
  try {
    const init = { method, headers: { ...headers } };
    if (body !== undefined) {
      init.body = typeof body === "string" ? body : JSON.stringify(body);
      if (!init.headers["Content-Type"]) init.headers["Content-Type"] = "application/json";
    }
    const res = await fetch(url, init);
    const text = await res.text();
    const ok = expect.length ? expect.includes(res.status) : res.ok;
    results.push({ name, status: res.status, ok });
    return { res, text };
  } catch (e) {
    results.push({ name, status: "ERR", ok: false, err: String(e.message || e) });
    return { res: null, text: "" };
  }
}

function bearer(token) {
  return { Authorization: `Bearer ${token}` };
}

async function main() {
  console.log(`Audit production — Base: ${base}`);
  console.log(`Email uji: ${email}\n`);

  await req("GET", "/", { label: "GET /" });
  await req("GET", "/ping", { label: "GET /ping" });
  await req("HEAD", "/ping", { label: "HEAD /ping" });
  await req("GET", "/api/ping", { label: "GET /api/ping" });
  await req("GET", "/healthz", { label: "GET /healthz", expect: [200, 503] });
  await req("GET", "/api/healthz", { label: "GET /api/healthz", expect: [200, 503] });
  await req("GET", "/openapi.json", { label: "GET /openapi.json", expect: [200, 404] });
  await req("GET", "/swagger", { label: "GET /swagger", expect: [200, 404] });
  await req("GET", "/metrics", { label: "GET /metrics", expect: [200, 404] });
  await req("GET", "/gateway/verify", { label: "GET /gateway/verify", expect: [200] });
  await req("GET", "/api/playground/models?provider=gemini", {
    label: "GET /api/playground/models?provider=gemini",
    expect: [200],
  });
  await req("POST", "/internal/upload-expiry", {
    body: {},
    label: "POST /internal/upload-expiry (tanpa secret)",
    expect: [401],
  });

  await req("POST", "/api/auth/register", {
    body: { email, password },
    label: "POST /api/auth/register",
    expect: [200, 201, 409],
  });

  const login = await req("POST", "/api/auth/login", {
    body: { email, password },
    label: "POST /api/auth/login",
    expect: [200],
  });

  let token = null;
  if (login.res?.ok) {
    try {
      token = JSON.parse(login.text).token;
    } catch {
      /* */
    }
  }

  if (!token) {
    console.warn("\nLogin gagal — endpoint terautentikasi tidak diuji.\n");
  } else {
    const h = bearer(token);
    await req("GET", "/api/auth/me", { headers: h, label: "GET /api/auth/me" });
    await req("GET", "/api/stats", { headers: h, label: "GET /api/stats" });
    await req("GET", "/api/dashboard/keys", { headers: h, label: "GET /api/dashboard/keys" });
    await req("GET", "/api/keys?page=1&pageSize=5", { headers: h, label: "GET /api/keys" });
    await req("GET", "/api/credentials?page=1&pageSize=5", { headers: h, label: "GET /api/credentials" });
    await req("POST", "/api/auth/refresh", { headers: h, label: "POST /api/auth/refresh" });
    await req("POST", "/gateway/gemini/chat", {
      body: { prompt: "hi" },
      label: "POST /gateway/gemini/chat (tanpa API key)",
      expect: [401],
    });
  }

  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);

  console.log("\n— Hasil —");
  for (const r of results) {
    const mark = r.ok ? "OK" : "XX";
    const extra = r.err ? ` ${r.err}` : "";
    console.log(`  ${mark} ${r.status}  ${r.name}${extra}`);
  }

  console.log(`\nOK: ${passed.length} / ${results.length}`);
  if (failed.length) {
    console.log(`Gagal: ${failed.length}`);
    process.exitCode = 1;
  } else {
    console.log("\nAudit production: semua cek lolos.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});