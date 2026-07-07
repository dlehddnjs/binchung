import { boundingExtent, type Extent } from "ol/extent";

export interface ClusterMember {
  statId: string;
  coordinate: [number, number];
}

export type ClusterClickResult =
  | { type: "select"; statId: string }
  | { type: "zoomToExtent"; extent: Extent };

export function resolveClusterClick(members: ClusterMember[]): ClusterClickResult {
  if (members.length === 0) {
    throw new Error("resolveClusterClick: 빈 클러스터는 입력으로 올 수 없다");
  }

  const distinctStatIds = new Set(members.map((member) => member.statId));
  if (distinctStatIds.size === 1) {
    return { type: "select", statId: members[0].statId };
  }
  return { type: "zoomToExtent", extent: boundingExtent(members.map((member) => member.coordinate)) };
}
