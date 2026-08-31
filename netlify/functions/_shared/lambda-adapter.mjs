function requestUrl(event) {
  if (event.rawUrl) return event.rawUrl;
  const host = event.headers?.host || "localhost";
  const path = event.rawPath || event.path || "/";
  const query = event.rawQuery ? `?${event.rawQuery}` : "";
  return `https://${host}${path}${query}`;
}

export function asLambdaHandler(webHandler) {
  return async function lambdaHandler(event) {
    const method = String(event.httpMethod || "GET").toUpperCase();
    const headers = new Headers(event.headers || {});
    let body;
    if (!['GET', 'HEAD'].includes(method) && event.body !== undefined && event.body !== null) {
      body = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64')
        : String(event.body);
    }
    const response = await webHandler(new Request(requestUrl(event), { method, headers, body }));
    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
      isBase64Encoded: false,
    };
  };
}
