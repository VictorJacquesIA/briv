import { headers } from "next/headers";

export async function getRequestContext() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");

  return {
    ip: forwardedFor?.split(",")[0]?.trim() ?? realIp,
    userAgent: headerStore.get("user-agent"),
  };
}
