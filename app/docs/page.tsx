import DocsPage from "@/components/DocsPage";
import { headers } from "next/headers";
import { resolveApiBase } from "@/lib/site-url";

export const metadata = { title: "Agent Poker — API Docs" };

export default async function DocsRoute() {
  const h = await headers();
  const apiBase = resolveApiBase({
    host: h.get("host"),
    forwardedHost: h.get("x-forwarded-host"),
    forwardedProto: h.get("x-forwarded-proto"),
  });

  return <DocsPage apiBase={apiBase} />;
}
