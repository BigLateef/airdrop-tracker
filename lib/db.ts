import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  // Thrown at request time, not import time, so `next build` doesn't fail
  // before env vars are configured on Vercel.
  console.warn("DATABASE_URL is not set — DB calls will fail until it is.");
}

export const sql = neon(process.env.DATABASE_URL ?? "");
