import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Health Check Endpoint
 * Used by load balancers and monitoring systems to verify service health
 *
 * GET /api/health
 * Returns 200 if healthy, 503 if unhealthy
 */
export async function GET() {
  const startTime = Date.now();
  const checks: {
    name: string;
    status: "healthy" | "unhealthy";
    responseTime?: number;
    error?: string;
  }[] = [];

  // 1. Database connectivity check
  try {
    const dbCheckStart = Date.now();
    await db.execute(sql`SELECT 1 as health_check`);
    checks.push({
      name: "database",
      status: "healthy",
      responseTime: Date.now() - dbCheckStart,
    });
  } catch (error) {
    checks.push({
      name: "database",
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown database error",
    });
  }

  // 2. Environment variables check (critical ones)
  const requiredEnvVars = [
    "DATABASE_URL",
    "NEON_AUTH_BASE_URL",
    "NEON_AUTH_COOKIE_SECRET",
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  checks.push({
    name: "environment",
    status: missingEnvVars.length === 0 ? "healthy" : "unhealthy",
    error:
      missingEnvVars.length > 0
        ? `Missing env vars: ${missingEnvVars.join(", ")}`
        : undefined,
  });

  // 3. Overall health status
  const isHealthy = checks.every((check) => check.status === "healthy");
  const totalResponseTime = Date.now() - startTime;

  const response = {
    status: isHealthy ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: totalResponseTime,
    checks,
    version: process.env.npm_package_version || "unknown",
    nodeVersion: process.version,
  };

  return NextResponse.json(response, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": "application/json",
    },
  });
}
