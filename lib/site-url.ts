/** Strip trailing slash from a base URL. */
export function normalizeBase(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Resolve the public API base URL.
 * Priority: explicit env → request host headers → localhost fallback.
 */
export function resolveApiBase(opts?: {
  envUrl?: string | null;
  host?: string | null;
  forwardedHost?: string | null;
  forwardedProto?: string | null;
}): string {
  const env =
    opts?.envUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL;
  if (env) return normalizeBase(env);

  const host = opts?.forwardedHost || opts?.host;
  if (host) {
    const proto =
      opts?.forwardedProto ||
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https");
    return `${proto}://${host}`;
  }

  return "http://localhost:3000";
}

export function apiBaseFromRequest(req: Request): string {
  return resolveApiBase({
    host: req.headers.get("host"),
    forwardedHost: req.headers.get("x-forwarded-host"),
    forwardedProto: req.headers.get("x-forwarded-proto"),
  });
}
