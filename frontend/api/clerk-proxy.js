export const config = {
  runtime: "nodejs",
};

/**
 * Validates that an origin belongs strictly to an allowed Clerk upstream domain.
 * Prevents SSRF and leaking Clerk-Secret-Key to arbitrary or deceptive domains.
 */
function isAllowedClerkOrigin(originUrl, verifiedInstanceOrigin) {
  try {
    const parsed = typeof originUrl === "string" ? new URL(originUrl) : originUrl;
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // 1. Official Clerk Frontend API proxy host
    if (host === "frontend-api.clerk.dev") {
      return true;
    }

    // 2. Verified instance origin (from configuration or publishable key)
    if (verifiedInstanceOrigin) {
      try {
        const parsedInstance = new URL(verifiedInstanceOrigin);
        if (parsed.origin === parsedInstance.origin) {
          return true;
        }
      } catch {
        // Ignore invalid URL
      }
    }

    // 3. Strict match for development instances: <instance-name>.clerk.accounts.dev
    const parts = host.split(".");
    if (
      parts.length === 4 &&
      parts[0].length > 0 &&
      parts[1] === "clerk" &&
      parts[2] === "accounts" &&
      parts[3] === "dev"
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Resolves and validates the upstream Clerk Frontend API URL.
 * Guarantees that the proxy never forwards requests back to itself or unmapped CNAMEs.
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
          if (isAllowedClerkOrigin(`https://${host}`)) {
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

/**
 * Sanitizes and filters upstream Set-Cookie headers before sending to client.
 * Drops Cloudflare bot cookies targeting upstream domains and fixes/preserves legitimate cookies.
 */
function sanitizeSetCookieHeaders(cookies, reqHost) {
  if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
    return [];
  }

  const cleanCookies = [];
  const normalizedReqHost = reqHost.toLowerCase().split(":")[0];
  const knownAuthCookies = new Set([
    "__session",
    "__client",
    "__client_uat",
    "__clerk_db_jwt",
    "__clerk_handshake",
  ]);

  for (const cookieStr of cookies) {
    if (!cookieStr || typeof cookieStr !== "string") continue;

    // Extract cookie name
    const nameMatch = cookieStr.match(/^\s*([^=;]+)=/);
    const cookieName = nameMatch ? nameMatch[1].trim().toLowerCase() : "";

    // Extract Domain attribute if present
    const domainMatch = cookieStr.match(/;\s*Domain=([^;]+)/i);
    const cookieDomain = domainMatch
      ? domainMatch[1].trim().toLowerCase().replace(/^\./, "")
      : null;

    // Drop Cloudflare bot & infrastructure cookies targeted at frontend-api.clerk.dev
    if (["__cf_bm", "_cfuvid", "__cfruid", "cf_clearance"].includes(cookieName)) {
      if (cookieDomain && !normalizedReqHost.endsWith(cookieDomain)) {
        continue;
      }
    }

    // Check foreign domain mismatch
    if (cookieDomain && !normalizedReqHost.endsWith(cookieDomain)) {
      // If it's a known Clerk authentication cookie with an upstream domain, strip the Domain attribute so it becomes a valid host-only cookie for reqHost
      if (knownAuthCookies.has(cookieName) || cookieDomain === "frontend-api.clerk.dev") {
        const fixedCookie = cookieStr.replace(/;\s*Domain=[^;]+/i, "");
        cleanCookies.push(fixedCookie);
        continue;
      }
      // Drop other foreign cookies that browsers would reject
      continue;
    }

    cleanCookies.push(cookieStr);
  }

  return cleanCookies;
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

  // Extract path from __clerk_path, subpath, path, or pathname
  let path =
    incoming.searchParams.get("__clerk_path") ||
    incoming.searchParams.get("subpath");

  // Clean internal routing query parameters injected by Vercel
  incoming.searchParams.delete("__clerk_path");
  incoming.searchParams.delete("subpath");

  if (!path && incoming.pathname.startsWith("/__clerk")) {
    path = incoming.pathname.replace(/^\/__clerk\/?/, "");
  } else if (!path && incoming.pathname.startsWith("/api/clerk-proxy")) {
    path = incoming.pathname.replace(/^\/api\/clerk-proxy\/?/, "");
  }

  path = path || "";

  // Delete Vercel route param 'path' if it matches the extracted path
  if (incoming.searchParams.get("path") === path) {
    incoming.searchParams.delete("path");
  }

  let currentTargetUrl = new URL(
    path.replace(/^\/+/, ""),
    upstreamOrigin.endsWith("/") ? upstreamOrigin : `${upstreamOrigin}/`
  );
  currentTargetUrl.search = incoming.search;

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
    const method = req.method || "GET";

    let upstream;
    const accumulatedCookies = [];
    const maxRedirects = 3;
    let redirectCount = 0;

    // Execute upstream request with controlled redirect following for verified Clerk internal origins
    while (true) {
      upstream = await fetch(currentTargetUrl, {
        method,
        headers,
        body: redirectCount === 0 ? body : undefined,
        redirect: "manual",
      });

      // Collect cookies from this hop
      if (typeof upstream.headers.getSetCookie === "function") {
        const hopCookies = upstream.headers.getSetCookie();
        if (hopCookies && hopCookies.length > 0) {
          accumulatedCookies.push(...hopCookies);
        }
      }

      // Check if response is a redirect (301, 302, 307, 308)
      if ([301, 302, 307, 308].includes(upstream.status)) {
        const location = upstream.headers.get("location");
        if (location) {
          let resolvedLocation = new URL(location, currentTargetUrl);

          // If upstream formatted redirect using Clerk-Proxy-Url back to our proxy
          let isProxyPath = false;
          if (resolvedLocation.href.startsWith(proxyUrl)) {
            isProxyPath = true;
            const proxyUrlPath = new URL(proxyUrl).pathname;
            const subpath = resolvedLocation.pathname
              .slice(proxyUrlPath.length)
              .replace(/^\/+/, "");
            const newTarget = new URL(
              subpath,
              upstreamOrigin.endsWith("/") ? upstreamOrigin : `${upstreamOrigin}/`
            );
            newTarget.search = resolvedLocation.search;
            resolvedLocation = newTarget;
          }

          // Strict validation: Only follow internal redirects to verified Clerk upstream origins
          const isVerifiedClerkOrigin =
            isProxyPath || isAllowedClerkOrigin(resolvedLocation.origin, upstreamOrigin);
          const isSafeMethod = ["GET", "HEAD"].includes(method);

          if (isVerifiedClerkOrigin && isSafeMethod && redirectCount < maxRedirects) {
            currentTargetUrl = resolvedLocation;
            redirectCount++;
            continue;
          }
        }
      }

      // Exit loop for non-redirects, external OAuth redirects, non-GET redirects, or max redirects reached
      break;
    }

    res.status(upstream.status);

    // Apply sanitized cookies to response
    const sanitizedCookies = sanitizeSetCookieHeaders(accumulatedCookies, reqHost);
    if (sanitizedCookies.length > 0) {
      res.setHeader("set-cookie", sanitizedCookies);
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

    if (method === "HEAD" || upstream.status === 204 || upstream.status === 304) {
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
