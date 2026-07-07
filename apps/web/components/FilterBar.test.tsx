// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import { describe, expect, it } from "vitest";
import { filterAtom } from "../lib/atoms";
import { FilterBar } from "./FilterBar";

describe("FilterBar", () => {
  it("타입 select를 바꾸면 filterAtom.chgerType이 갱신된다", () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <FilterBar />
      </Provider>,
    );

    fireEvent.change(screen.getByLabelText("충전기 타입"), { target: { value: "fast" } });

    expect(store.get(filterAtom).chgerType).toBe("fast");
  });

  it("상태 select를 바꾸면 filterAtom.stat이 갱신된다", () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <FilterBar />
      </Provider>,
    );

    fireEvent.change(screen.getByLabelText("충전 상태"), { target: { value: "charging" } });

    expect(store.get(filterAtom).stat).toBe("charging");
  });

  it("타입을 '전체'로 되돌리면 chgerType 필드가 제거된다", () => {
    const store = createStore();
    store.set(filterAtom, { chgerType: "fast" });
    render(
      <Provider store={store}>
        <FilterBar />
      </Provider>,
    );

    fireEvent.change(screen.getByLabelText("충전기 타입"), { target: { value: "" } });

    expect(store.get(filterAtom).chgerType).toBeUndefined();
  });
});
