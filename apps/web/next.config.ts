import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/*": [
      "../../node_modules/sharp/**/*",
      "../../node_modules/@img/sharp-*/**/*",
    ],
  },
  poweredByHeader: false,
  devIndicators: false,
  async headers() {
    return [{source: "/:path*", headers: [
      {key: "X-Content-Type-Options", value: "nosniff"},
      {key: "Referrer-Policy", value: "strict-origin-when-cross-origin"},
      {key: "X-Frame-Options", value: "DENY"}
    ]}, ...["/invite/:path*", "/sign-in", "/sign-up", "/verify-email", "/forgot-password", "/auth/action"].map(source => ({ source, headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "private, no-store" },
    ] }))];
  },
  async rewrites() {
    const apiTarget = process.env.INTERNAL_API_URL || "http://api:8088";
    return [
      {
        source: "/v1/:path*",
        destination: `${apiTarget}/v1/:path*`,
      },
      {
        source: "/local/:path*",
        destination: `${apiTarget}/local/:path*`,
      },
    ];
  },
};

export default config;
