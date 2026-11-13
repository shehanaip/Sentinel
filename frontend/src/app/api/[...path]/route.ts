import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const apiServerUrl = process.env.API_SERVER_URL?.replace(/\/+$/, "");
const retryableStatuses = new Set([502, 503, 504]);
const retryDelays = [5000, 10000, 15000];

async function proxy(request: NextRequest): Promise<Response> {
  if (!apiServerUrl) {
    return Response.json({ detail: "API_SERVER_URL is not configured." }, { status: 503 });
  }

  const pathname = request.nextUrl.pathname.endsWith("/")
    ? request.nextUrl.pathname
    : `${request.nextUrl.pathname}/`;
  const target = new URL(`${pathname}${request.nextUrl.search}`, apiServerUrl);
  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("connection");
  headers.delete("content-length");
  headers.set("x-forwarded-proto", "https");

  const method = request.method.toUpperCase();
  const init: RequestInit & { duplex?: "half" } = {
    method,
    headers,
    cache: "no-store",
    redirect: "manual",
  };
  if (method !== "GET" && method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  const canRetry = ["GET", "HEAD", "OPTIONS"].includes(method);
  let upstream: Response | null = null;
  for (let attempt = 0; ; attempt += 1) {
    try {
      upstream = await fetch(target, init);
      if (!canRetry || !retryableStatuses.has(upstream.status) || attempt === retryDelays.length) break;
      await upstream.body?.cancel();
    } catch (error) {
      if (!canRetry || attempt === retryDelays.length) {
        console.error("API proxy request failed.", error);
        return Response.json(
          { detail: "The API is temporarily unavailable while it starts. Please retry shortly." },
          { status: 503 },
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
  }

  if (!upstream) {
    return Response.json({ detail: "The API is temporarily unavailable. Please retry shortly." }, { status: 503 });
  }

  const responseHeaders = new Headers(upstream.headers);
  const setCookies = upstream.headers.getSetCookie();
  responseHeaders.delete("set-cookie");
  responseHeaders.delete("transfer-encoding");
  responseHeaders.delete("connection");
  setCookies.forEach((cookie) => responseHeaders.append("set-cookie", cookie));

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export {
  proxy as DELETE,
  proxy as GET,
  proxy as HEAD,
  proxy as OPTIONS,
  proxy as PATCH,
  proxy as POST,
  proxy as PUT,
};
