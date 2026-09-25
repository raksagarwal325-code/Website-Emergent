// Same-origin, narrowly scoped gateway to the existing quotation API. Never
// expose the backend's bearer token or make this a general-purpose proxy.
const ORIGIN = "https://samratglass.com";
const endpoint = /^\/(?:auth\/(?:me|session|logout)|admin\/(?:quotations(?:\/[a-zA-Z0-9_-]+)?|inquiries\/[a-zA-Z0-9_-]+\/quotations|products\/export)|ai\/quotation-customisation|upload|files\/[a-zA-Z0-9_./-]+)$/;
const allowed = (path, method) => {
  if (!endpoint.test(path) || path.includes("..") || path.includes("/originals/")) return false;
  if (path === "/auth/me" || path === "/admin/products/export" || path.startsWith("/files/")) return method === "GET";
  if (path === "/auth/session" || path === "/auth/logout" || path === "/ai/quotation-customisation" || path === "/upload") return method === "POST";
  if (/^\/admin\/inquiries\/[a-zA-Z0-9_-]+\/quotations$/.test(path)) return ["GET", "POST"].includes(method);
  if (path === "/admin/quotations") return ["GET", "POST"].includes(method);
  if (/^\/admin\/quotations\/[a-zA-Z0-9_-]+$/.test(path)) return ["PUT", "DELETE"].includes(method);
  return false;
};

export default async function gateway(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/(?:\.netlify\/functions\/gateway|api)/, "");
  const method = request.method.toUpperCase();
  const common = { "cache-control": "no-store", "x-content-type-options": "nosniff" };
  if (!allowed(path, method)) return new Response("Not found", { status: 404, headers: common });

  // Browser cross-site forms and fetches cannot supply our custom header and
  // a matching Origin. Require both for every state-changing call.
  if (!["GET", "HEAD"].includes(method) &&
      (request.headers.get("origin") !== url.origin || request.headers.get("x-requested-with") !== "fetch")) {
    return new Response("Forbidden", { status: 403, headers: common });
  }

  const headers = new Headers();
  headers.set("accept", request.headers.get("accept") || "application/json");
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const session = request.headers.get("cookie")?.match(/(?:^|;\s*)session_token=([^;]+)/)?.[1];
  if (session) headers.set("cookie", `session_token=${session}`);
  if (method !== "GET") headers.set("x-requested-with", "fetch");

  try {
    const upstream = await fetch(`${ORIGIN}/api${path}`, {
      method,
      headers,
      body: method === "GET" ? undefined : request.body,
      ...(method === "GET" ? {} : { duplex: "half" }),
      redirect: "manual",
      signal: AbortSignal.timeout(20000),
    });
    const responseHeaders = new Headers(common);
    const type = upstream.headers.get("content-type");
    if (type) responseHeaders.set("content-type", type);
    // Host-only cookie on the Netlify domain. Never forward arbitrary
    // upstream cookies or their Domain attribute.
    const cookie = upstream.headers.get("set-cookie");
    if (cookie && /^session_token=/i.test(cookie)) {
      const value = (cookie.match(/^session_token=([^;]*)/i)?.[1] || "").replace(/^""$/, "");
      if (/^[a-zA-Z0-9_-]*$/.test(value)) {
        const maxAge = cookie.match(/(?:^|;)\s*Max-Age=(\d+)/i)?.[1];
        responseHeaders.set("set-cookie", `session_token=${value}; Path=/; HttpOnly; Secure; SameSite=Lax${maxAge ? `; Max-Age=${maxAge}` : ""}`);
      }
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return new Response("Quotation service is temporarily unavailable", { status: 502, headers: common });
  }
}
