import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const apiServerUrl = process.env.API_SERVER_URL?.replace(/\/+$/, "");

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

  const upstream = await fetch(target, init);
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
