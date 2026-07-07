// @vitest-environment jsdom
import type { ChargerMapRow } from "@binchung/db";
import { fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it } from "vitest";
import { chargersAtom, selectedStationIdAtom } from "../lib/atoms";
import { DetailSheet } from "./DetailSheet";

function makeRow(overrides: Partial<ChargerMapRow> = {}): ChargerMapRow {
  return {
    statId: "ST1",
    chgerId: "01",
    name: "테스트 충전소",
    addr: "테스트 주소",
    lat: 37.5,
    lng: 127.0,
    zcode: "11",
    chgerType: "04",
    stat: 2,
    statUpdDt: new Date("2026-07-06T00:00:00.000Z"),
    ...overrides,
  };
}

describe("DetailSheet", () => {
  it("선택된 충전소가 없으면 아무것도 렌더링하지 않는다", () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <DetailSheet />
      </Provider>,
    );

    expect(screen.queryByRole("region", { name: "충전소 상세" })).not.toBeInTheDocument();
  });

  it("선택된 충전소의 이름/주소/충전기 상태 목록을 보여준다", () => {
    const store = createStore();
    store.set(chargersAtom, [
      makeRow({ chgerId: "01", stat: 2 }),
      makeRow({ chgerId: "02", stat: 3 }),
    ]);
    store.set(selectedStationIdAtom, "ST1");

    render(
      <Provider store={store}>
        <DetailSheet />
      </Provider>,
    );

    expect(screen.getByRole("region", { name: "충전소 상세" })).toBeInTheDocument();
    expect(screen.getByText("테스트 충전소")).toBeInTheDocument();
    expect(screen.getByText("테스트 주소")).toBeInTheDocument();
    expect(screen.getByText("대기")).toBeInTheDocument();
    expect(screen.getByText("충전중")).toBeInTheDocument();
  });

  it("선택되지 않은 다른 충전소의 충전기는 목록에 안 나온다", () => {
    const store = createStore();
    store.set(chargersAtom, [
      makeRow({ statId: "ST1", chgerId: "01" }),
      makeRow({ statId: "ST2", chgerId: "01", name: "다른 충전소" }),
    ]);
    store.set(selectedStationIdAtom, "ST1");

    render(
      <Provider store={store}>
        <DetailSheet />
      </Provider>,
    );

    expect(screen.queryByText("다른 충전소")).not.toBeInTheDocument();
  });

  it("닫기 버튼을 누르면 selectedStationIdAtom이 null이 된다", () => {
    const store = createStore();
    store.set(chargersAtom, [makeRow()]);
    store.set(selectedStationIdAtom, "ST1");

    render(
      <Provider store={store}>
        <DetailSheet />
      </Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "닫기" }));

    expect(store.get(selectedStationIdAtom)).toBeNull();
  });
});
