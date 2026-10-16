type ProgressRulerProps = {
  value: number;
  max: number;
  label: string;
  segments?: number;
  // Fill color, e.g. "bg-career".
  colorClass: string;
  heightClass?: string;
};

// Graduated ruler: the progress fills ticks one by one, like a measuring instrument.
export function ProgressRuler({
  value,
  max,
  label,
  segments = 10,
  colorClass,
  heightClass = 'h-2.5',
}: ProgressRulerProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`flex gap-0.75 ${heightClass}`}
    >
      {Array.from({ length: segments }, (_, index) => {
        const fill = Math.min(1, Math.max(0, ratio * segments - index));
        return (
          <span
            key={index}
            className="relative flex-1 overflow-hidden rounded-tick bg-surface-sunken"
          >
            <span
              className={`absolute inset-y-0 left-0 rounded-tick ${colorClass}`}
              style={{ width: `${fill * 100}%` }}
            />
          </span>
        );
      })}
    </div>
  );
}
