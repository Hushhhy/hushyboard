import type { ComponentProps, ReactNode } from 'react';
import type { ApplicationStatus } from '@/generated/prisma/client';

// Each status has its own shape AND label: the color is never the only signal.
// The color only tints the outline and the shape; the label stays ivory.
const STATUSES = {
  SENT: { label: 'Envoyée', colorClass: 'text-fg-2', shape: 'arrow' },
  WAITING: { label: 'En attente', colorClass: 'text-fg-3', shape: 'hourglass' },
  HR_INTERVIEW: { label: 'Entretien RH', colorClass: 'text-info', shape: 'disc' },
  TECH_INTERVIEW: { label: 'Entretien technique', colorClass: 'text-info', shape: 'code' },
  OFFER: { label: 'Offre', colorClass: 'text-career', shape: 'hexagon' },
  REJECTED: { label: 'Refusée', colorClass: 'text-danger', shape: 'cross' },
  NO_RESPONSE: { label: 'Sans réponse', colorClass: 'text-fg-3', shape: 'dotted' },
  FOLLOWED_UP: { label: 'Relancée', colorClass: 'text-warning', shape: 'loop' },
} as const satisfies Record<
  ApplicationStatus,
  { label: string; colorClass: string; shape: string }
>;

type Shape = (typeof STATUSES)[ApplicationStatus]['shape'];

const SHAPES: Record<Shape, ReactNode> = {
  arrow: <path d="M2.5 6h6M6 3l3 3-3 3" fill="none" />,
  hourglass: <path d="M3 2h6M3 10h6M3.5 2.2 8.5 9.8M8.5 2.2 3.5 9.8" fill="none" />,
  disc: <circle cx="6" cy="6" r="3.5" fill="currentColor" stroke="none" />,
  code: <path d="M4.5 3 1.8 6l2.7 3M7.5 3l2.7 3-2.7 3" fill="none" />,
  hexagon: <path d="M6 1.5 9.9 3.75v4.5L6 10.5 2.1 8.25v-4.5z" fill="currentColor" />,
  cross: <path d="m3 3 6 6M9 3 3 9" fill="none" />,
  dotted: <circle cx="6" cy="6" r="3.8" fill="none" strokeDasharray="1.6 1.6" />,
  loop: <path d="M9.5 4.5H4a2 2 0 0 0 0 4h3.5M7.5 2.5l2 2-2 2" fill="none" />,
};

export function statusLabel(status: ApplicationStatus): string {
  return STATUSES[status].label;
}

function PillContent({ status }: { status: ApplicationStatus }) {
  const { label, shape } = STATUSES[status];
  return (
    <>
      <svg
        viewBox="0 0 12 12"
        aria-hidden="true"
        className="size-3 shrink-0"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {SHAPES[shape]}
      </svg>
      <span className="text-fg-1">{label}</span>
    </>
  );
}

function pillClasses(status: ApplicationStatus): string {
  const outline = status === 'NO_RESPONSE' ? 'border-dashed' : '';
  return (
    'inline-flex h-6 w-fit items-center gap-1 rounded-pill border border-current bg-surface-default px-2 ' +
    'text-caption-12 font-semibold whitespace-nowrap transition-colors duration-(--duration-change) ' +
    `${STATUSES[status].colorClass} ${outline}`
  );
}

// Read-only status of an application.
export function StatusPill({ status }: { status: ApplicationStatus }) {
  return (
    <span className={pillClasses(status)}>
      <PillContent status={status} />
    </span>
  );
}

// Same pill used as a toggle filter (aria-pressed).
export function StatusFilterPill({
  status,
  pressed,
  className = '',
  ...props
}: { status: ApplicationStatus; pressed: boolean } & Omit<ComponentProps<'button'>, 'children'>) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`${pillClasses(status)} hover:bg-surface-raised aria-pressed:bg-surface-raised ${className}`}
      {...props}
    >
      <PillContent status={status} />
    </button>
  );
}
