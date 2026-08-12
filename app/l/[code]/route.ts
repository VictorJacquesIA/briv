import { NextResponse } from "next/server";

import { checkRateLimit } from "@/lib/rate-limit";
import { resolveShortLink } from "@/services/short-link-service";
import { getRequestContext } from "@/services/request-context";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { ip } = await getRequestContext();
  const allowed = await checkRateLimit(`shortlink:${ip ?? "unknown"}`, 60, 60);
  if (!allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const { code } = await params;
  const targetUrl = await resolveShortLink(code);

  if (!targetUrl) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(targetUrl);
}
