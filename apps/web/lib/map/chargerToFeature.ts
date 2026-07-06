import { mapStatToUiStatus } from "@binchung/core";
import type { ChargerMapRow } from "@binchung/db";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { fromLonLat } from "ol/proj";

export function chargerToFeature(row: ChargerMapRow): Feature<Point> {
  const feature = new Feature({
    geometry: new Point(fromLonLat([row.lng, row.lat])),
  });
  feature.set("statId", row.statId);
  feature.set("chgerId", row.chgerId);
  feature.set("uiStatus", mapStatToUiStatus(row.stat));
  return feature;
}
