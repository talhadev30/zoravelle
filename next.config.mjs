/** @type {import('next').NextConfig} */
const imageKitRemotePatterns = (() => {
  const endpointValue = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!endpointValue) return [];

  try {
    const endpoint = new URL(endpointValue);
    if (endpoint.protocol !== "https:") return [];
    const pattern = {
      protocol: "https",
      hostname: endpoint.hostname,
      pathname: `${endpoint.pathname.replace(/\/+$/, "")}/**`,
    };
    if (endpoint.port) pattern.port = endpoint.port;
    return [pattern];
  } catch {
    return [];
  }
})();

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }]
    : []),
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0" }],
      },
    ];
  },
  images: { remotePatterns: [...imageKitRemotePatterns, { protocol: "https", hostname: "**.googleusercontent.com" }] },
  experimental: {
    agentFeedback: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;