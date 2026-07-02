// One-time setup: node db/init.mjs
// Reads DATABASE_URL from .env / environment and applies schema.sql to your Neon DB.
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}

const sql = neon(url);
const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");

// neon's tagged-template client executes one statement at a time, so split
// on semicolons that end a statement (schema.sql has no semicolons inside strings).
const statements = schema
  .split(/;\s*(?:\n|$)/)
  .map((s) => s.trim())
  .filter(Boolean);

for (const stmt of statements) {
  console.log("Running:", stmt.slice(0, 60).replace(/\n/g, " ") + "...");
  await sql(stmt);
}

console.log(`Done. Applied ${statements.length} statements.`);
