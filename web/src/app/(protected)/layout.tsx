import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isValidSessionToken, SESSION_COOKIE } from "@/lib/auth";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!isValidSessionToken(token)) redirect("/login");
  return children;
}
