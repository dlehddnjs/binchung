import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    // @binchung/core, @binchung/db는 미발행 워크스페이스 패키지라 컴파일된 dist 없이
    // src/index.ts를 그대로 소비한다(이슈 #5). 그 소스가 Node ESM 관례대로 상대 import에
    // ".js" 확장자를 쓰는데, webpack은 tsc/vitest와 달리 이걸 자동으로 ".ts"에
    // 매핑해주지 않으므로 명시적으로 별칭을 등록한다.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
