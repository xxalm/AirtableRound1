/**
 * Assigns a compact lane index to each item.
 * - items: [{ id, name, start:"YYYY-MM-DD", end:"YYYY-MM-DD" }]
 * - options:
 *    - gapDays: min spacing between items in the same lane (default 0)
 *    - minSpanDays: min duration to help fit labels (default 0)
 * @returns array of items augmented with { lane }.
 */
export default function assignLanes(items, { gapDays = 0, minSpanDays = 0 } = {}) {
  const MS = 24 * 60 * 60 * 1000;
  const toMs = (s) => {
    const d = new Date(s);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  
  const byStart = items
    .map((it, idx) => ({ ...it, __i: idx }))
    .sort((a, b) => (toMs(a.start) - toMs(b.start)) || (toMs(a.end) - toMs(b.end)));

  const lanesEnd = []; 
  const out = [];
  const gapMs = gapDays * MS;

  for (const it of byStart) {
    const s = toMs(it.start);
    let e = toMs(it.end);

    
    const minEnd = s + minSpanDays * MS;
    if (e < minEnd) e = minEnd;

    
    let lane = 0;
    while (lane < lanesEnd.length && s < (lanesEnd[lane] + gapMs)) lane++;
    if (lane === lanesEnd.length) lanesEnd.push(0);

    lanesEnd[lane] = e;
    out.push({ ...it, lane });
  }
  
  return out.map(({ __i, ...rest }) => rest);
}
