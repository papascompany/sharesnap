import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 모노레포 오인(상위 디렉토리 lockfile) 방지 — 워크스페이스 루트 고정
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
