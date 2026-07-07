"use client";

import { useAtom } from "jotai";
import type { ChangeEvent } from "react";
import { filterAtom } from "../lib/atoms";

export function FilterBar() {
  const [filter, setFilter] = useAtom(filterAtom);

  function handleTypeChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    setFilter((prev) => ({
      ...prev,
      chgerType: value === "" ? undefined : (value as "fast" | "slow"),
    }));
  }

  function handleStatChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    setFilter((prev) => ({
      ...prev,
      stat: value === "" ? undefined : (value as "waiting" | "charging" | "other"),
    }));
  }

  return (
    <div style={barStyle}>
      <select aria-label="충전기 타입" value={filter.chgerType ?? ""} onChange={handleTypeChange}>
        <option value="">전체</option>
        <option value="fast">급속</option>
        <option value="slow">완속</option>
      </select>
      <select aria-label="충전 상태" value={filter.stat ?? ""} onChange={handleStatChange}>
        <option value="">전체</option>
        <option value="waiting">대기</option>
        <option value="charging">충전중</option>
        <option value="other">기타</option>
      </select>
    </div>
  );
}

const barStyle = {
  position: "absolute",
  top: 12,
  left: 12,
  zIndex: 10,
  display: "flex",
  gap: 8,
  background: "white",
  padding: 8,
  borderRadius: 8,
  boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
} as const;
