import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ["192.168.100.6"],
  async redirects() {
    return [
      { source: "/buy", destination: "/", permanent: false },
      { source: "/locations", destination: "/", permanent: false },
      { source: "/plans", destination: "/", permanent: false },
      { source: "/support", destination: "/", permanent: false },
      { source: "/terms", destination: "/", permanent: false },
      { source: "/privacy", destination: "/", permanent: false },
      { source: "/refund-policy", destination: "/", permanent: false },
      { source: "/my-vouchers", destination: "/", permanent: false },
      { source: "/balance", destination: "/", permanent: false },
      { source: "/voucher/check", destination: "/", permanent: false },
      { source: "/login", destination: "/admin", permanent: false },
      { source: "/forgot-password", destination: "/", permanent: false },
      { source: "/dashboard", destination: "/", permanent: false },
      { source: "/dashboard/:path*", destination: "/", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
