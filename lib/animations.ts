// Read before any animation driven by JavaScript (level-up celebration):
// the OS can ask for reduced motion, and Alex can turn animations off (<html data-animations="off">).
export function animationsEnabled(): boolean {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const turnedOff = document.documentElement.dataset.animations === 'off';
  return !reduced && !turnedOff;
}
