"use client";

import type { ChargerMapRow } from "@binchung/db";
import { useAtom, useSetAtom } from "jotai";
import "ol/ol.css";
import Map from "ol/Map";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { fromLonLat } from "ol/proj";
import Cluster from "ol/source/Cluster";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import View from "ol/View";
import { useEffect, useRef } from "react";
import { chargersAtom, viewportAtom } from "../lib/atoms";
import { extent3857ToBboxLngLat } from "../lib/map/bboxExtent";
import { chargerToFeature } from "../lib/map/chargerToFeature";
import { clusterStyleFunction } from "../lib/map/clusterStyleFunction";
import { KOREA_CENTER, KOREA_DEFAULT_ZOOM } from "../lib/map/koreaBbox";
import { useChargersFeed } from "../lib/statusFeed/useChargersFeed";

export interface ChargerMapProps {
  initialChargers: ChargerMapRow[];
  initialTruncated: boolean;
}

export function ChargerMap({ initialChargers, initialTruncated }: ChargerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const vectorSourceRef = useRef<VectorSource | null>(null);

  const [viewport, setViewport] = useAtom(viewportAtom);
  const setChargers = useSetAtom(chargersAtom);

  const feed = useChargersFeed(
    { bbox: viewport },
    { initialData: { chargers: initialChargers, truncated: initialTruncated } },
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const vectorSource = new VectorSource();
    vectorSourceRef.current = vectorSource;

    const clusterLayer = new VectorLayer({
      source: new Cluster({ source: vectorSource, distance: 40 }),
      style: clusterStyleFunction,
    });

    const map = new Map({
      target: containerRef.current,
      layers: [new TileLayer({ source: new OSM() }), clusterLayer],
      view: new View({ center: fromLonLat(KOREA_CENTER), zoom: KOREA_DEFAULT_ZOOM }),
    });

    const handleMoveEnd = () => {
      const size = map.getSize();
      if (!size) return;
      const extent = map.getView().calculateExtent(size) as [number, number, number, number];
      setViewport(extent3857ToBboxLngLat(extent));
    };
    map.on("moveend", handleMoveEnd);
    handleMoveEnd(); // moveend는 최초 렌더에서 안 뜨므로 마운트 직후 한 번 수동 트리거

    return () => {
      map.setTarget(undefined);
      vectorSourceRef.current = null;
    };
    // Map/View/Layer 인스턴스는 최초 1회만 생성 — atom 값(viewport)이 바뀌어도 재생성하지 않는다.
    // setViewport(jotai setter)는 참조가 안정적이라 사실상 한 번만 실행된다.
  }, [setViewport]);

  useEffect(() => {
    setChargers(feed.chargers);
    const source = vectorSourceRef.current;
    if (!source) return;
    source.clear();
    source.addFeatures(feed.chargers.map(chargerToFeature));
  }, [feed.chargers, setChargers]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
