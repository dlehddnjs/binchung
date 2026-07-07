import { describe, expect, it } from "vitest";
import { resolveClusterClick } from "./resolveClusterClick";

describe("resolveClusterClick", () => {
  it("멤버가 1개면 그 충전소를 선택한다", () => {
    const result = resolveClusterClick([{ statId: "ST1", coordinate: [100, 200] }]);
    expect(result).toEqual({ type: "select", statId: "ST1" });
  });

  it("멤버가 여러 개여도 모두 같은 statId면 선택한다 (한 충전소의 여러 충전기)", () => {
    const result = resolveClusterClick([
      { statId: "ST1", coordinate: [100, 200] },
      { statId: "ST1", coordinate: [101, 201] },
    ]);
    expect(result).toEqual({ type: "select", statId: "ST1" });
  });

  it("서로 다른 statId가 섞여 있으면 bounding extent로 줌인한다", () => {
    const result = resolveClusterClick([
      { statId: "ST1", coordinate: [100, 200] },
      { statId: "ST2", coordinate: [300, 400] },
    ]);
    expect(result.type).toBe("zoomToExtent");
    if (result.type === "zoomToExtent") {
      expect(result.extent).toEqual([100, 200, 300, 400]);
    }
  });

  it("빈 배열이면 예외를 던진다 (OL Cluster는 항상 1개 이상을 담으므로 프로그래머 불변식 위반)", () => {
    expect(() => resolveClusterClick([])).toThrow();
  });
});
