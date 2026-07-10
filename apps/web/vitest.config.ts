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
    // vitest 4의 defaultExclude는 dist/를 안 뺀다 — build 산출물의 컴파일된
    // *.test.js가 소스와 중복 실행되며 공유 리소스(DB 등)를 오염시키는 걸 막는다.
    exclude: ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/.next/**"],
  },
});
