import { NextResponse } from "next/server";

import { resolveShortLink } from "@/services/short-link-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const targetUrl = await resolveShortLink(code);

  if (!targetUrl) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.redirect(targetUrl);
}
