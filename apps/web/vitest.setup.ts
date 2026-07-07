import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// test.globals를 켜지 않았으므로 @testing-library/react의 자동 cleanup이
// 동작하지 않는다 — 파일 안에서 render()가 누적되지 않게 명시적으로 정리한다.
// jsdom이 아닌 파일에서도 아무것도 렌더하지 않았으면 no-op이라 안전하다.
afterEach(() => {
  cleanup();
});
