import type { NextConfig } from "next";
import dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
};
export default nextConfig;