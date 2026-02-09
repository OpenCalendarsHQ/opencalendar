import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security Headers - Essential for production
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: "/:path*",
        headers: [
          // Prevent clickjacking attacks
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Enable browser XSS protection (legacy, but still useful)
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Enforce HTTPS for 1 year
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Control which features and APIs can be used
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Referrer policy to control information leakage
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // Content Security Policy - Protect against XSS and injection attacks
          // Note: 'unsafe-inline' and 'unsafe-eval' are needed for Next.js
          // In production, consider using nonces or hashes for better security
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://neonauth.eu-west-2.aws.neon.tech https://*.googleapis.com https://*.google.com https://*.apple.com wss://*.neon.tech",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // Performance: Enable compression
  compress: true,

  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
};

export default nextConfig;
