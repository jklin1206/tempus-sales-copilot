import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The market CSV, CRM notes, and product vault are read with fs from server
  // code only. Tracing them here guarantees they are bundled into the Vercel
  // serverless function instead of being silently absent at runtime.
  outputFileTracingIncludes: {
    "/api/brief": ["./data/**/*", "./knowledge-vault/**/*", "./prompts/**/*"],
    "/**": ["./data/**/*", "./knowledge-vault/**/*", "./fixtures/**/*"],
  },
};

export default nextConfig;
