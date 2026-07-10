import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // vitest 4의 defaultExclude는 dist/를 안 뺀다 — build 산출물의 컴파일된
    // *.test.js가 소스와 중복 실행되며 공유 리소스(DB 등)를 오염시키는 걸 막는다.
    exclude: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
  },
});
