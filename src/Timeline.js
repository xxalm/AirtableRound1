import React, { useMemo, useRef, useState, useEffect } from "react";
import assignLanes from "./assignLanes";
import timelineItems from "./timelineItems";

const MS = 24 * 60 * 60 * 1000;
const PX_PER_DAY = 35;
const GUTTER = 180;

function toLaneArrays(result) {
  if (!Array.isArray(result) || result.length === 0) return [];
  if (Array.isArray(result[0])) return result;
  const byLane = new Map();
  for (const it of result) {
    const idx = (it.lane ?? it._lane ?? 0) | 0;
    if (!byLane.has(idx)) byLane.set(idx, []);
    byLane.get(idx).push(it);
  }
  return Array.from(byLane.keys())
    .sort((a, b) => a - b)
    .map((k) => byLane.get(k));
}

function parseYmd(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function Timeline() {  
  const lanes = useMemo(() => {
    try {
      const res = assignLanes(timelineItems);
      return toLaneArrays(res);
    } catch {
      return [];
    }
  }, []);

  
  const [minDate, maxDate] = useMemo(() => {
    const all = timelineItems.flatMap(({ start, end }) => [parseYmd(start), parseYmd(end)]);
    const min = new Date(Math.min(...all.map((d) => +d)));
    const max = new Date(Math.max(...all.map((d) => +d)));
    return [min, max];
  }, []);

  const totalDays = Math.floor((maxDate - minDate) / MS) + 1;
  
  const leftFor = (dateStr) => {
    const days = Math.floor((parseYmd(dateStr) - minDate) / MS);
    return GUTTER + days * PX_PER_DAY;
  };
  const widthFor = (startStr, endStr) => {
    const days = Math.floor((parseYmd(endStr) - parseYmd(startStr)) / MS) + 1;
    return Math.max(1, days * PX_PER_DAY);
  };
  
  const scrollerRef = useRef(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => setScrollLeft(el.scrollLeft);
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="tl-root">
      {/* Header sincronizado */}
      <div className="tl-header">
        <div className="tl-ticksRow" aria-hidden>
          <div className="tl-headerWrap" style={{ width: GUTTER + totalDays * PX_PER_DAY }}>
            <div className="tl-gutterDivider" />
            <div
              className="tl-ticksTrack"
              style={{
                width: totalDays * PX_PER_DAY,
                transform: `translateX(${-scrollLeft}px)`
              }}
            >
              {Array.from({ length: totalDays }, (_, i) => {
                const d = new Date(minDate);
                d.setDate(d.getDate() + i);
                const day = d.getDate();
                const mon = d.toLocaleString("en-US", { month: "short" });
                return (
                  <div key={i} className="tl-tick" style={{ left: i * PX_PER_DAY }}>
                    <div className="tl-tickLabel">
                      <div>{day}</div>
                      <div className="tl-tickMon">{mon}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Corpo scrollável */}
      <div ref={scrollerRef} className="tl-scroller">
        <div className="tl-canvas" style={{ width: GUTTER + totalDays * PX_PER_DAY }}>
          {/* máscara do gutter (evita bleed de barras para a coluna da esquerda) */}
          <div className="tl-bodyMask" />

          {/* marcador "Hoje" */}
          <div
            className="tl-today"
            style={{ left: GUTTER + Math.floor((Date.now() - minDate) / MS) * PX_PER_DAY }}
            aria-label="Today"
          />

          {/* Lanes */}
          {lanes.map((lane, laneIndex) => (
            <div key={laneIndex} className="tl-lane" style={{ height: 50 }} role="list">
              <div className="tl-laneHeader">Lane {laneIndex + 1}</div>

              {lane.map((item) => (
                <div
                  key={item.id}
                  className="tl-item"
                  role="listitem"
                  title={`${item.name}\n${item.start} – ${item.end}`}
                  style={{
                    left: leftFor(item.start),
                    width: widthFor(item.start, item.end),
                    top: 8
                  }}
                >
                  <span className="tl-label">{item.name}</span>
                </div>
              ))}

              <div className="tl-rowGuide" style={{ top: 24 }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }} aria-hidden>
        <strong>Timeline</strong>
        <span className="tl-helper">Gutter fixo, ticks em duas linhas, layout compacto</span>
      </div>
    </div>
  );
}
