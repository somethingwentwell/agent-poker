/** Authorize dump/restore. Production requires DUMP_SECRET; dev allows open access. */
export function authorizeDump(req: Request): boolean {
  const secret = process.env.DUMP_SECRET?.trim();
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}
