import { defineConfig } from "vitest/config";

export default defineConfig({
  // tsconfig.json의 jsx: "preserve"는 Next의 자체 컴파일러(SWC/webpack)를 위한 설정이라
  // vite(기본 oxc 트랜스폼)가 그대로 따르면 raw JSX 문법을 못 읽는다 — oxc를 끄고
  // esbuild로 테스트 트랜스폼만 별도 지정.
  oxc: false,
  esbuild: {
    jsx: "automatic",
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
  },
});
