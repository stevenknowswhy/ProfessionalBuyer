import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@buyer/contract"],
};

export default withAui(nextConfig);
