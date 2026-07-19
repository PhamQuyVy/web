import type { NextConfig } from "next";

const configuredActionOrigins = [
  "localhost:3000",
  process.env.NEXT_PUBLIC_APP_URL,
  ...(process.env.ALLOWED_ORIGINS ?? "").split(","),
]
  .map((value) => value?.trim())
  .filter(Boolean)
  .map((value) => {
    try {
      return new URL(value as string).host;
    } catch {
      return value as string;
    }
  });

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [...new Set(configuredActionOrigins)],
      bodySizeLimit: "500kb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
