import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getPool } from "./db";
import type { Pool } from "pg";

export function isConfigured() {
  return Boolean(process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET);
}

export function createAuth(pool: Pool, secret: string, baseURL?: string) {
  return betterAuth({
    appName: "Happen",
    database: pool,
    secret,
    baseURL,
    advanced: { ipAddress: { ipAddressHeaders: ["x-real-ip"] } },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    plugins: [nextCookies()],
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  if (!isConfigured()) throw new Error("Authentication is not configured");
  instance ??= createAuth(
    getPool(),
    process.env.BETTER_AUTH_SECRET!,
    process.env.BETTER_AUTH_URL,
  );
  return instance;
}

export async function getCurrentUser(request: Request) {
  if (!isConfigured()) return null;
  const session = await getAuth().api.getSession({ headers: request.headers });
  return session?.user ?? null;
}
