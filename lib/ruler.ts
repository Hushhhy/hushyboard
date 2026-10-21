// How full each segment of a ruler is, from 0 to 1.
// e.g. 7 / 10 over 4 segments → [1, 1, 0.8, 0]: the progress fills ticks one by one.
export function segmentFills(value: number, max: number, segments: number): number[] {
  const count = Math.max(0, Math.floor(segments));
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return Array.from({ length: count }, (_, index) =>
    Math.min(1, Math.max(0, ratio * count - index))
  );
}

// Width of a bar compared with the largest value of its chart, in percent (0 to 100).
export function barWidthPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}
