import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "inventory_session";
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

function password(): string {
  const value = process.env.AUTH_PASSWORD;
  if (!value) throw new Error("AUTH_PASSWORD is not configured");
  return value;
}

function signature(payload: string): string {
  return createHmac("sha256", `inventory-dashboard-session:${password()}`)
    .update(payload)
    .digest("base64url");
}

function equal(a: string, b: string): boolean {
  // Hash first so comparison time does not reveal the secret's byte length.
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function passwordMatches(candidate: string): boolean {
  return equal(candidate, password());
}

export function createSessionToken(now = Date.now()): string {
  const expiresAt = Math.floor(now / 1000) + SESSION_TTL_SECONDS;
  const payload = Buffer.from(String(expiresAt)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function isValidSessionToken(token?: string, now = Date.now()): boolean {
  if (!token || token.length > 256) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !equal(parts[1], signature(parts[0]))) return false;

  const decoded = Buffer.from(parts[0], "base64url").toString("utf8");
  if (!/^\d{10}$/.test(decoded)) return false;
  return Number(decoded) > Math.floor(now / 1000);
}
