import type { ComponentProps, ReactNode } from 'react';
import { PauseIcon } from '@/components/icons';

type HabitCheckboxProps = Omit<ComponentProps<'input'>, 'type' | 'children'> & {
  // The habit name: inside the <label>, so the whole row is clickable and read aloud.
  label: ReactNode;
  // Extra content on the right of the row (week strip, streak…).
  aside?: ReactNode;
};

// Habit-style checkbox: a real <input type="checkbox">, drawn with appearance-none.
// Space toggles it; the check mark draws itself when checked.
export function HabitCheckbox({ label, aside, className = '', ...props }: HabitCheckboxProps) {
  return (
    <label
      className={`flex min-h-9 items-center gap-3 rounded-control px-2 py-1 hover:bg-surface-raised ${className}`}
    >
      <span className="relative grid size-6 shrink-0 place-items-center">
        <input
          type="checkbox"
          className="peer size-6 appearance-none rounded-pill border-[1.5px] border-line-strong transition-[background-color,border-color,scale] duration-(--duration-tick) ease-spring checked:border-habits checked:bg-habits active:scale-92 disabled:opacity-55"
          {...props}
        />
        <svg
          viewBox="0 0 14 14"
          aria-hidden="true"
          className="pointer-events-none absolute size-3.5 fill-none stroke-surface-sunken stroke-[2.4] [stroke-dasharray:16] [stroke-dashoffset:16] transition-[stroke-dashoffset] delay-40 duration-(--duration-tick) ease-out-soft peer-checked:[stroke-dashoffset:0]"
        >
          <path d="M3 7.4 5.8 10 11 4.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="min-w-0 flex-1 text-body-14 font-medium">{label}</span>
      {aside}
    </label>
  );
}

// Paused habit (holidays): nothing to check, the streak is frozen.
export function PausedHabit({
  label,
  until,
  aside,
}: {
  label: ReactNode;
  // Already formatted, e.g. "19 octobre".
  until: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex min-h-9 items-center gap-3 px-2 py-1 text-fg-3">
      <span
        role="img"
        aria-label={`En pause jusqu'au ${until}`}
        className="grid size-6 shrink-0 place-items-center rounded-pill border-[1.5px] border-dashed border-fg-3"
      >
        <PauseIcon className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 text-body-14 font-medium">{label}</span>
      {aside}
    </div>
  );
}
