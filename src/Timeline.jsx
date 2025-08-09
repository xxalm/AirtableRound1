import React, { useMemo, useRef, useState, useEffect } from "react";
import assignLanes from "./assignLanes";

const MS = 24 * 60 * 60 * 1000;
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

  const [pxPerDay, setPxPerDay] = useState(70);
  const leftFor = (dateStr) => {
    const days = Math.floor((parseYmd(dateStr) - minDate) / MS);
    return GUTTER + days * pxPerDay;
  };
  const widthFor = (startStr, endStr) => {
    const days = Math.floor((parseYmd(endStr) - parseYmd(startStr)) / MS) + 1;
    return Math.max(1, days * pxPerDay);
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

  const onWheel = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cursorX = el.scrollLeft + (e.clientX - rect.left);
      const xFromScale = Math.max(0, cursorX - GUTTER);
      const daysAtCursor = xFromScale / pxPerDay;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const next = Math.max(4, Math.min(400, pxPerDay * factor));
      setPxPerDay(next);
      const newCursorX = GUTTER + daysAtCursor * next;
      const newScroll = newCursorX - (e.clientX - rect.left);
      requestAnimationFrame(() => {
        el.scrollLeft = Math.max(0, newScroll);
      });
    }
  };

  const dragRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [draftName, setDraftName] = useState("");

  const beginImmediate = (e, item, kind) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget;
    dragRef.current = {
      kind,
      id: item.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      origStart: parseYmd(item.start),
      origEnd: parseYmd(item.end),
      lastDeltaDays: null,
      pending: false,
      el
    };
    if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  };

  const beginMovePending = (e, item) => {
    if (editingId) return;
    const el = e.currentTarget;
    dragRef.current = {
      kind: "move",
      id: item.id,
      pointerId: e.pointerId,
      startX: e.clientX,
      origStart: parseYmd(item.start),
      origEnd: parseYmd(item.end),
      lastDeltaDays: null,
      pending: true,
      el
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end, { once: true });
  };

  const move = (e) => {
    const st = dragRef.current;
    if (!st || e.pointerId !== st.pointerId) return;
    const dx = e.clientX - st.startX;
    if (st.pending) {
      if (Math.abs(dx) < 4) return;
      st.pending = false;
      if (st.el && st.el.setPointerCapture) st.el.setPointerCapture(e.pointerId);
      document.body.style.userSelect = "none";
    }
    const deltaDays = Math.round(dx / pxPerDay);
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

  const end = (e) => {
    const st = dragRef.current;
    if (st && e.pointerId === st.pointerId) {
      dragRef.current = null;
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", move);
    }
  };

  const startEdit = (item, e) => {
    e.stopPropagation();
    setEditingId(item.id);
    setDraftName(item.name);
  };
  const commitEdit = (item) => {
    if (draftName.trim() && draftName !== item.name) {
      onChangeItem?.({ ...item, name: draftName.trim() });
    }
    setEditingId(null);
  };
  const cancelEdit = () => setEditingId(null);

  const minLabelPx = 80;
  const steps = [1, 2, 3, 5, 7, 10, 14, 21, 30];
  const dayStep = steps.find((s) => s * pxPerDay >= minLabelPx) ?? steps[steps.length - 1];

  return (
    <div className="tl-root">
      <div className="tl-header">
        <div className="tl-ticksRow" aria-hidden>
          <div className="tl-headerWrap" style={{ width: GUTTER + totalDays * pxPerDay }}>
            <div className="tl-gutterDivider" />
            <div
              className="tl-ticksTrack"
              style={{ width: totalDays * pxPerDay, transform: `translateX(-${scrollLeft}px)` }}
            >
              {Array.from({ length: Math.ceil(totalDays / dayStep) }, (_, k) => {
                const i = k * dayStep;
                const d = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate() + i);
                const label = formatYMD(d);
                return (
                  <div key={i} className="tl-tick" style={{ left: i * pxPerDay }}>
                    <div className="tl-tickLabel">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollerRef} className="tl-scroller" onWheel={onWheel}>
        <div className="tl-canvas" style={{ width: GUTTER + totalDays * pxPerDay }}>
          <div className="tl-bodyMask" />
          <div
            className="tl-today"
            style={{ left: GUTTER + Math.floor((Date.now() - minDate) / MS) * pxPerDay }}
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
                  style={{
                    left: leftFor(item.start),
                    width: widthFor(item.start, item.end),
                    top: 8
                  }}
                >
                  <div
                    className="tl-handle tl-handle-start"
                    data-role="start"
                    onPointerDown={(e) => beginImmediate(e, item, "start")}
                  />
                  <div
                    className="tl-moveGrip"
                    data-role="move"
                    onDoubleClick={(e) => startEdit(item, e)}
                    onPointerDown={(e) => beginMovePending(e, item)}
                  >
                    {editingId === item.id ? (
                      <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onBlur={() => commitEdit(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(item);
                          if (e.key === "Escape") cancelEdit();
                        }}
                        style={{
                          width: "100%",
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          font: "inherit",
                          padding: 0
                        }}
                      />
                    ) : (
                      <span className="tl-label">{item.name}</span>
                    )}
                  </div>
                  <div
                    className="tl-handle tl-handle-end"
                    data-role="end"
                    onPointerDown={(e) => beginImmediate(e, item, "end")}
                  />
                </div>
              ))}
              <div className="tl-rowGuide" style={{ top: 24 }} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }} aria-hidden>
        <strong>Timeline</strong>
        <span className="tl-helper">Zoom: Ctrl/Cmd + scroll</span>
      </div>
    </div>
  );
}
