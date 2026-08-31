/** @type {import('next').NextConfig} */
const nextConfig = {
  // shared workspace package ships raw TS source — Next must transpile it
  transpilePackages: ["@url-checker/shared"],
};

module.exports = nextConfig;
