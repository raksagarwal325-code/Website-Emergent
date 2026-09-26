import test from "node:test";
import assert from "node:assert/strict";
import gateway from "../netlify/functions/gateway.js";

const origin = "https://quotes.example.netlify.app";
const request = (path, method = "GET", headers = {}, body) => new Request(`${origin}/api${path}`, { method, headers, body });

test("blocks arbitrary admin API and path traversal", async () => {
  for (const path of ["/admin/settings", "/admin/products", "/files/originals/secret.jpg", "/admin/quotations/../../settings"]) {
    assert.equal((await gateway(request(path))).status, 404);
  }
});

test("requires both same origin and CSRF header on writes", async () => {
  assert.equal((await gateway(request("/admin/quotations", "POST", { "x-requested-with": "fetch" }))).status, 403);
  assert.equal((await gateway(request("/admin/quotations", "POST", { origin: "https://attacker.test", "x-requested-with": "fetch" }))).status, 403);
  assert.equal((await gateway(request("/admin/quotations", "POST", { origin }))).status, 403);
});

test("allows only POST for the quotation AI endpoint", async t => {
  assert.equal((await gateway(request("/ai/quotation-customisation"))).status, 404);

  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://samratglass.com/api/ai/quotation-customisation");
    assert.equal(init.method, "POST");
    return new Response(JSON.stringify({ item_name: "Prepared item" }), {
      headers: { "content-type": "application/json" },
    });
  };

  const result = await gateway(request(
    "/ai/quotation-customisation",
    "POST",
    { origin, "x-requested-with": "fetch", "content-type": "application/json" },
    "{}",
  ));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { item_name: "Prepared item" });
});

test("forwards only session cookie and rewrites set-cookie to this host", async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "https://samratglass.com/api/auth/session");
    assert.equal(init.headers.get("cookie"), "session_token=old-session");
    return new Response(JSON.stringify({ email: "admin@example.com" }), {
      headers: { "set-cookie": "session_token=new-session; Domain=samratglass.com; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=86400", "content-type": "application/json" },
    });
  };
  const result = await gateway(request("/auth/session", "POST", { origin, "x-requested-with": "fetch", cookie: "other=value; session_token=old-session", "content-type": "application/json" }, "{}"));
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("set-cookie"), "session_token=new-session; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400");
  assert.equal(result.headers.get("cache-control"), "no-store");
});

test("logout expires the Netlify cookie", async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = async () => new Response("{}", {
    headers: { "set-cookie": 'session_token=""; Max-Age=0; Path=/; HttpOnly' },
  });
  const result = await gateway(request("/auth/logout", "POST", { origin, "x-requested-with": "fetch" }));
  assert.equal(result.headers.get("set-cookie"), "session_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
});
