export const config = {
  runtime: "nodejs",
};

/**
 * Resolves and validates the upstream Clerk Frontend API URL.
 * Guarantees that the proxy never forwards requests back to itself or broken CNAMEs.
 */
function resolveUpstreamBaseUrl(frontendApiUrl, publishableKey) {
  // If explicitly configured, validate that it is not our own domain or broken CNAME
  if (frontendApiUrl) {
    let candidate = frontendApiUrl.trim();
    if (!candidate.startsWith("http://") && !candidate.startsWith("https://")) {
      candidate = `https://${candidate}`;
    }
    try {
      const parsed = new URL(candidate);
      const host = parsed.hostname.toLowerCase();
      // Ensure we NEVER forward to our own proxy or unconfigured CNAME
      if (!host.endsWith("hulma.vercel.app") && host !== "clerk.hulma.vercel.app") {
        return parsed.origin;
      }
    } catch {
      // Fall through to standard upstream
    }
  }

  // If a publishable key is present and points to a valid Clerk domain (e.g. accounts.dev)
  if (publishableKey) {
    try {
      const parts = publishableKey.split("_");
      if (parts.length === 3 && parts[2]) {
        const decoded = Buffer.from(parts[2], "base64").toString("utf-8");
        if (decoded.endsWith("$")) {
          const host = decoded.slice(0, -1).toLowerCase();
          if (
            host.includes(".clerk.accounts.") ||
            (host.endsWith(".clerk.dev") && host !== "frontend-api.clerk.dev")
          ) {
            return `https://${host}`;
          }
        }
      }
    } catch {
      // Fall through to standard upstream
    }
  }

  // Official Clerk upstream Frontend API for production proxies
  return "https://frontend-api.clerk.dev";
}

/**
 * Extracts the incoming request body across all Vercel Node runtime formats
 * (parsed object, string, Buffer, or unconsumed stream).
 */
async function getRequestBody(req) {
  if (["GET", "HEAD"].includes(req.method || "GET")) {
    return undefined;
  }
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body)) {
      return req.body;
    }
    if (typeof req.body === "string") {
      return req.body;
    }
    if (typeof req.body === "object") {
      return JSON.stringify(req.body);
    }
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) {
    return undefined;
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const configuredFrontendApi = process.env.CLERK_FRONTEND_API_URL;
  const publishableKey =
    process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;

  if (!secretKey) {
    return res.status(500).json({
      error: "Clerk secret key is missing from environment configuration",
    });
  }

  const reqHost =
    req.headers["x-forwarded-host"] || req.headers["host"] || "hulma.vercel.app";
  const proto = req.headers["x-forwarded-proto"] || "https";

  const proxyUrl =
    process.env.VITE_CLERK_PROXY_URL ||
    process.env.CLERK_PROXY_URL ||
    `${proto}://${reqHost}/__clerk`;

  const upstreamOrigin = resolveUpstreamBaseUrl(
    configuredFrontendApi,
    publishableKey
  );

  const incoming = new URL(req.url || "/", `${proto}://${reqHost}`);

  // Extract path from __clerk_path query param or pathname
  let path = incoming.searchParams.get("__clerk_path");
  if (path !== null && path !== undefined) {
    incoming.searchParams.delete("__clerk_path");
  } else if (incoming.pathname.startsWith("/__clerk")) {
    path = incoming.pathname.replace(/^\/__clerk\/?/, "");
  } else if (incoming.pathname.startsWith("/api/clerk-proxy")) {
    path = incoming.pathname.replace(/^\/api\/clerk-proxy\/?/, "");
  } else {
    path = "";
  }

  const upstreamUrl = new URL(
    path.replace(/^\/+/, ""),
    upstreamOrigin.endsWith("/") ? upstreamOrigin : `${upstreamOrigin}/`
  );
  upstreamUrl.search = incoming.search;

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (
      value &&
      !["host", "connection", "content-length", "clerk-secret-key", "clerk-proxy-url"].includes(
        name.toLowerCase()
      )
    ) {
      headers.set(name, Array.isArray(value) ? value.join(", ") : value);
    }
  }

  headers.set("Clerk-Proxy-Url", proxyUrl);
  headers.set("Clerk-Secret-Key", secretKey);

  const forwardedFor = req.headers["x-forwarded-for"];
  const clientIp = forwardedFor
    ? Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(",")[0].trim()
    : req.socket?.remoteAddress || "";

  if (clientIp) {
    headers.set("X-Forwarded-For", clientIp);
  }
  headers.set("X-Forwarded-Proto", proto);

  try {
    const body = await getRequestBody(req);

    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });

    res.status(upstream.status);

    // Forward Set-Cookie headers properly preserving array structure
    if (typeof upstream.headers.getSetCookie === "function") {
      const cookies = upstream.headers.getSetCookie();
      if (cookies && cookies.length > 0) {
        res.setHeader("set-cookie", cookies);
      }
    }

    upstream.headers.forEach((value, name) => {
      const lower = name.toLowerCase();
      if (["transfer-encoding", "connection", "set-cookie"].includes(lower)) {
        return;
      }
      if (lower === "location") {
        // Rewrite upstream location redirects to route through the proxy, while preserving external OAuth redirects
        let location = value;
        try {
          if (location.startsWith(upstreamOrigin)) {
            location = location.replace(upstreamOrigin, proxyUrl);
          } else if (location.startsWith("https://frontend-api.clerk.dev")) {
            location = location.replace("https://frontend-api.clerk.dev", proxyUrl);
          }
        } catch {
          // Keep original location on parsing error
        }
        res.setHeader("location", location);
        return;
      }
      res.setHeader(name, value);
    });

    if (req.method === "HEAD" || upstream.status === 204 || upstream.status === 304) {
      return res.end();
    }

    const data = await upstream.arrayBuffer();
    return res.end(Buffer.from(data));
  } catch {
    return res.status(502).json({
      error: "Clerk proxy request failed",
    });
  }
}
