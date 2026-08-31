import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // shared workspace package ships raw TS source — Next must transpile it
  transpilePackages: ["@url-checker/shared"],
};

export default nextConfig;
