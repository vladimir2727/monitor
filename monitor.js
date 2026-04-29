const TARGET_DOMAIN = Deno.env.get("TARGET_DOMAIN") || "";

const FORBIDDEN_HEADERS = new Set([
  "host", "connection", "keep-alive", "proxy-authenticate", 
  "proxy-authorization", "te", "trailer", "transfer-encoding", 
  "upgrade", "forwarded", "x-forwarded-host", "x-forwarded-proto"
]);

export default async (request, context) => {
  if (!TARGET_DOMAIN) {
    return new Response("Metric Pipeline Standby", { status: 200 });
  }

  try {
    const url = new URL(request.url);
    
    const upstreamUrl = `https://${TARGET_DOMAIN.replace(/\/$/, "")}${url.pathname}${url.search}`;

    const newHeaders = new Headers();
    for (const [key, value] of request.headers) {
      const lowerKey = key.toLowerCase();
      if (FORBIDDEN_HEADERS.has(lowerKey) || lowerKey.startsWith("x-nf-") || lowerKey.startsWith("x-netlify-")) continue;
      newHeaders.set(key, value);
    }

   
    newHeaders.set("X-Internal-ID", "Node-L2-Edge");

    const response = await fetch(upstreamUrl, {
      method: request.method,
      headers: newHeaders,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      redirect: "manual",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("transfer-encoding");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    return new Response("Internal Processing Node Down", { status: 502 });
  }
};