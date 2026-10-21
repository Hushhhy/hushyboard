import type { ReactNode } from 'react';
import { CloseIcon } from '@/components/icons';

type ErrorStateProps = {
  // What failed: "Import impossible."
  title: string;
  // Cause and fix, in plain French.
  description?: string;
  // Usually a secondary "Réessayer" button.
  action?: ReactNode;
  // true when the error appears after one of Alex's actions (announced by screen readers).
  // false for an error already there when the page loads.
  announce?: boolean;
  className?: string;
};

// Persistent error: never a toast, never disappears on its own.
// Red only carries the icon and the left rule; the text stays ivory.
export function ErrorState({
  title,
  description,
  action,
  announce = false,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role={announce ? 'alert' : undefined}
      className={`flex items-start gap-3 rounded-control border-l-3 border-danger bg-surface-default p-3 ${className}`}
    >
      <CloseIcon className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={2} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-body-14 font-semibold">{title}</p>
        {description ? <p className="text-body-14 text-fg-2">{description}</p> : null}
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
    </div>
  );
}

// Error under a form field. Link it with aria-describedby={id} and aria-invalid on the input.
export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-caption-12 text-fg-1">
      <CloseIcon className="size-3.5 shrink-0 text-danger" strokeWidth={2} />
      {children}
    </p>
  );
}
