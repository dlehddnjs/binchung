"use client";

import { mapStatToUiStatus } from "@binchung/core";
import { useAtom, useAtomValue } from "jotai";
import { chargersAtom, selectedStationIdAtom } from "../lib/atoms";
import { formatStatUpdDt } from "../lib/detail/formatStatUpdDt";
import { groupStationChargers } from "../lib/detail/groupStationChargers";
import { uiStatusLabel } from "../lib/detail/uiStatusLabel";
import { statusColor } from "../lib/map/statusColor";

export function DetailSheet() {
  const chargers = useAtomValue(chargersAtom);
  const [selectedStationId, setSelectedStationId] = useAtom(selectedStationIdAtom);
  const group = groupStationChargers(chargers, selectedStationId);

  if (!group) return null;

  return (
    <section aria-label="충전소 상세" style={sheetStyle}>
      <header style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>{group.name}</h2>
          {group.addr && <p style={{ margin: 0, color: "#6b7280" }}>{group.addr}</p>}
        </div>
        <button type="button" aria-label="닫기" onClick={() => setSelectedStationId(null)}>
          ×
        </button>
      </header>
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {group.chargers.map((charger) => {
          const uiStatus = mapStatToUiStatus(charger.stat);
          return (
            <li key={charger.chgerId} style={itemStyle}>
              <span>{charger.chgerId}</span>
              <span style={{ color: statusColor(uiStatus) }}>{uiStatusLabel[uiStatus]}</span>
              <time>{formatStatUpdDt(charger.statUpdDt)}</time>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const sheetStyle = {
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  maxHeight: "40%",
  overflowY: "auto",
  background: "white",
  borderTop: "1px solid #e5e7eb",
  boxShadow: "0 -2px 8px rgba(0,0,0,0.1)",
  padding: 16,
  zIndex: 10,
} as const;

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  marginBottom: 12,
} as const;

const itemStyle = {
  display: "flex",
  gap: 12,
  padding: "8px 0",
  borderBottom: "1px solid #f3f4f6",
} as const;
