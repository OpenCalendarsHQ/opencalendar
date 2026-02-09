import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Configure for serverless environments (Vercel, etc.)
const client = postgres(process.env.DATABASE_URL, {
  prepare: false, // Required for PgBouncer connection pooling
  max: 1, // Limit connections in serverless
});

export const db = drizzle(client, { schema });

export type Database = typeof db;
