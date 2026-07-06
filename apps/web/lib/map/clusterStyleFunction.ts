import type { UiChargerStatus } from "@binchung/core";
import type { FeatureLike } from "ol/Feature";
import { Circle, Fill, Stroke, Style, Text } from "ol/style";
import { dominantUiStatus } from "./dominantUiStatus";
import { statusColor } from "./statusColor";

export function clusterStyleFunction(feature: FeatureLike): Style {
  const members = (feature.get("features") as FeatureLike[] | undefined) ?? [feature];
  const statuses = members.map((member) => (member.get("uiStatus") as UiChargerStatus) ?? "unknown");
  const color = statusColor(dominantUiStatus(statuses));
  const size = members.length;

  return new Style({
    image: new Circle({
      radius: size > 1 ? 14 : 8,
      fill: new Fill({ color }),
      stroke: new Stroke({ color: "#ffffff", width: 2 }),
    }),
    text:
      size > 1
        ? new Text({ text: String(size), fill: new Fill({ color: "#ffffff" }) })
        : undefined,
  });
}
