import type { ReactNode } from 'react';
import Link from 'next/link';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
  icon?: ReactNode;
};

// Teaching empty state: says what is missing and how to fill it, with one action.
export function EmptyState({ title, description, actionLabel, actionHref, icon }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-1.5">
      {icon}
      <p className="font-semibold">{title}</p>
      <p className="text-body-14 text-fg-2">{description}</p>
      <Link
        href={actionHref}
        className="mt-1 text-body-14 font-semibold text-fg-2 underline-offset-2 hover:text-fg-1 hover:underline"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
