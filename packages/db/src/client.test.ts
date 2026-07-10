import { describe, expect, it } from "vitest";
import { createPool } from "./client.js";

describe("createPool", () => {
  it("idle 커넥션의 네트워크 에러(pool 'error' 이벤트)가 프로세스를 죽이지 않도록 리스너를 등록한다", async () => {
    const pool = createPool("postgres://unused:unused@localhost:1/unused");

    expect(pool.listenerCount("error")).toBeGreaterThan(0);

    // 리스너가 없으면 EventEmitter가 이 emit에서 uncaught exception을 던진다.
    expect(() => pool.emit("error", new Error("idle client network error"))).not.toThrow();

    await pool.end();
  });
});
