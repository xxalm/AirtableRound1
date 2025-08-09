import React, { useMemo, useRef, useState, useEffect } from "react";
import assignLanes from "./assignLanes";

const MS = 24 * 60 * 60 * 1000;
const PX_PER_DAY = 70;
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
function toYmd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function formatYMD(d) {
  return toYmd(d);
}

export default function Timeline({
  items,
  viewportStart,
  viewportEnd,
  onChangeItem,
}) {
  const lanes = useMemo(() => {
    try {
      const res = assignLanes(items);
      return toLaneArrays(res);
    } catch {
      return [];
    }
  }, [items]);

  const [minDate, maxDate] = useMemo(() => {
    if (viewportStart && viewportEnd) {
      return [parseYmd(viewportStart), parseYmd(viewportEnd)];
    }
    const all = items.flatMap(({ start, end }) => [parseYmd(start), parseYmd(end)]);
    const min = new Date(Math.min(...all.map((d) => +d)));
    const max = new Date(Math.max(...all.map((d) => +d)));
    return [min, max];
  }, [items, viewportStart, viewportEnd]);

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

  const dragRef = useRef(null);

  const startDrag = (e, item, kind) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = {
      kind,
      id: item.id,
      startX: e.clientX,
      origStart: parseYmd(item.start),
      origEnd: parseYmd(item.end),
      lastDeltaDays: null,
    };
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onDrag);
    window.addEventListener("mouseup", endDrag, { once: true });
  };

  const onDrag = (e) => {
    const st = dragRef.current;
    if (!st) return;
    const dx = e.clientX - st.startX;
    const deltaDays = Math.round(dx / PX_PER_DAY);
    if (deltaDays === st.lastDeltaDays) return;
    st.lastDeltaDays = deltaDays;

    const update = (orig) => {
      if (st.kind === "start") {
        const nextStart = new Date(st.origStart.getTime() + deltaDays * MS);
        const safeStart = nextStart <= st.origEnd ? nextStart : st.origEnd;
        return { ...orig, start: toYmd(safeStart) };
      }
      if (st.kind === "end") {
        const nextEnd = new Date(st.origEnd.getTime() + deltaDays * MS);
        const safeEnd = nextEnd >= st.origStart ? nextEnd : st.origStart;
        return { ...orig, end: toYmd(safeEnd) };
      }
      const nextStart = new Date(st.origStart.getTime() + deltaDays * MS);
      const nextEnd = new Date(st.origEnd.getTime() + deltaDays * MS);
      return { ...orig, start: toYmd(nextStart), end: toYmd(nextEnd) };
    };

    const current = items.find((i) => i.id === st.id);
    if (!current) return;
    onChangeItem?.(update(current));
  };

  const endDrag = () => {
    dragRef.current = null;
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onDrag);
  };

  return (
    <div className="tl-root">
      <div className="tl-header">
        <div className="tl-ticksRow" aria-hidden>
          <div className="tl-headerWrap" style={{ width: GUTTER + totalDays * PX_PER_DAY }}>
            <div className="tl-gutterDivider" />
            <div
              className="tl-ticksTrack"
              style={{ width: totalDays * PX_PER_DAY, transform: `translateX(-${scrollLeft}px)` }}
            >
              {Array.from({ length: totalDays }, (_, i) => {
                const d = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate() + i);
                const label = formatYMD(d);
                return (
                  <div key={i} className="tl-tick" style={{ left: i * PX_PER_DAY }}>
                    <div className="tl-tickLabel">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollerRef} className="tl-scroller">
        <div className="tl-canvas" style={{ width: GUTTER + totalDays * PX_PER_DAY }}>
          <div className="tl-bodyMask" />
          <div
            className="tl-today"
            style={{ left: GUTTER + Math.floor((Date.now() - minDate) / MS) * PX_PER_DAY }}
            aria-label="Today"
          />
          {lanes.map((lane, laneIndex) => (
            <div key={laneIndex} className="tl-lane" style={{ height: 50 }} role="list">
              <div className="tl-laneHeader">Lane {laneIndex + 1}</div>

              {lane.map((item) => (
                <div
                  key={item.id}
                  className="tl-item"
                  role="listitem"
                  title={`${item.name}\n${item.start} – ${item.end}`}
                  onMouseDown={(e) => {
                    const roleEl = e.target.closest("[data-role]");
                    const role = roleEl ? roleEl.getAttribute("data-role") : "move";
                    startDrag(e, item, role);
                  }}
                  style={{
                    left: leftFor(item.start),
                    width: widthFor(item.start, item.end),
                    top: 8
                  }}
                >
                  <div className="tl-handle tl-handle-start" data-role="start" />
                  <div className="tl-moveGrip" data-role="move">
                    <span className="tl-label">{item.name}</span>
                  </div>
                  <div className="tl-handle tl-handle-end" data-role="end" />
                </div>
              ))}

              <div className="tl-rowGuide" style={{ top: 24 }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }} aria-hidden>
        <strong>Timeline</strong>
        <span className="tl-helper">Drag nas bordas altera início/fim • Drag no centro move</span>
      </div>
    </div>
  );
}
