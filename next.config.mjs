/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  output: "standalone",
  serverExternalPackages: ["pg", "ioredis"],
};

export default nextConfig;
