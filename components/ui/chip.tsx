import type { ComponentProps, ReactNode } from 'react';

// Dot colors for a chip status (tools: discovered / using / mastered…).
export type ChipTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'career';

const DOT_CLASSES: Record<ChipTone, string> = {
  neutral: 'bg-fg-3',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  career: 'bg-career',
};

type ChipProps = Omit<ComponentProps<'button'>, 'children'> & {
  children: ReactNode;
  // Status dot before the label. The label (or a legend) must say what the color means.
  tone?: ChipTone;
  // Selected filter.
  pressed?: boolean;
  // Small count after the label.
  count?: number;
};

// Interactive chip: a filter, a tool, a keyword. Always a real button.
export function Chip({ children, tone, pressed, count, className = '', ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-body-14 whitespace-nowrap transition-colors duration-(--duration-tick) ${
        pressed
          ? 'border-line-strong bg-surface-raised font-semibold text-fg-1'
          : 'border-transparent bg-surface-default font-medium text-fg-2 hover:bg-surface-raised hover:text-fg-1'
      } ${className}`}
      {...props}
    >
      {tone ? (
        <span aria-hidden="true" className={`size-1.5 rounded-full ${DOT_CLASSES[tone]}`} />
      ) : null}
      {children}
      {count !== undefined ? (
        <span className="text-caption-12 text-fg-3 tabular">{count}</span>
      ) : null}
    </button>
  );
}

// Static label: offer skills, metadata. Not interactive.
export function Tag({ children, tone }: { children: ReactNode; tone?: ChipTone }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised px-2 py-0.5 text-caption-12 whitespace-nowrap text-fg-2">
      {tone ? (
        <span aria-hidden="true" className={`size-1.5 rounded-full ${DOT_CLASSES[tone]}`} />
      ) : null}
      {children}
    </span>
  );
}
