import { isAbsolute, relative, resolve, sep } from "node:path";

const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const links = new Map();
const port = Number(process.env.PORT || 3000);
const baseUrl = (
  process.env.BASE_URL ||
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${port}`)
).replace(/\/+$/, "");
const publicDir = process.env.PUBLIC_DIR ? resolve(process.env.PUBLIC_DIR) : null;

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: corsHeaders(),
  });
}

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extra,
  };
}

function makeCode() {
  let code = "";
  const bytes = new Uint8Array(8);
  while (code.length < 6) {
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte < 248) code += BASE62[byte % BASE62.length];
      if (code.length === 6) break;
    }
  }
  return code;
}

function createLink(url) {
  let code;
  do {
    code = makeCode();
  } while (links.has(code));

  const link = {
    code,
    url,
    shortUrl: `${baseUrl}/${code}`,
    hits: 0,
    createdAt: new Date().toISOString(),
  };
  links.set(code, link);
  return link;
}

async function serveStatic(pathname) {
  if (!publicDir) return null;

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return new Response("Bad Request", { status: 400, headers: corsHeaders() });
  }

  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.slice(1);
  const candidate = resolve(publicDir, relativePath);
  const pathFromRoot = relative(publicDir, candidate);
  if (
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    return null;
  }

  const file = Bun.file(candidate);
  if (!(await file.exists())) return null;
  return new Response(file, { headers: corsHeaders() });
}

Bun.serve({
  port,
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const requestUrl = new URL(request.url);
    const { pathname } = requestUrl;

    if (request.method === "POST" && pathname === "/api/links") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Request body must be valid JSON." }, 400);
      }

      if (typeof body?.url !== "string") {
        return json({ error: "url must be an HTTP or HTTPS URL." }, 400);
      }

      let parsedUrl;
      try {
        parsedUrl = new URL(body.url);
      } catch {
        return json({ error: "url must be an HTTP or HTTPS URL." }, 400);
      }
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        return json({ error: "url must be an HTTP or HTTPS URL." }, 400);
      }

      return json(createLink(parsedUrl.href), 201);
    }

    if (request.method === "GET" && pathname === "/api/links") {
      return json(Array.from(links.values()));
    }

    if (request.method === "GET") {
      const staticResponse = await serveStatic(pathname);
      if (staticResponse) return staticResponse;

      const code = pathname.slice(1);
      if (code && !code.includes("/")) {
        const link = links.get(code);
        if (link) {
          link.hits += 1;
          return new Response(null, {
            status: 302,
            headers: corsHeaders({ Location: link.url }),
          });
        }
      }
    }

    return json({ error: "Not found." }, 404);
  },
});

console.log(`Snip backend listening on http://localhost:${port}`);
