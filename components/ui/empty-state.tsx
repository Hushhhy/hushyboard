import type { ReactNode } from 'react';
import Link from 'next/link';
import { buttonClasses } from './button';

type EmptyStateProps = {
  // Concrete title: "Novembre est vide.", "Aucune candidature suivie."
  title: string;
  description?: string;
  // The action that fills the list. Primary only if the screen has no other primary button.
  action?: { label: string; href: string; primary?: boolean };
  // Custom actions instead of a link (buttons that open a panel, "Effacer les filtres"…).
  children?: ReactNode;
  // Domain emblem, 28px.
  icon?: ReactNode;
  // "card": inside a home module, no frame. "block": dashed frame (page or list).
  variant?: 'card' | 'block';
};

// Teaching empty state: says what is missing and how to fill it.
export function EmptyState({
  title,
  description,
  action,
  children,
  icon,
  variant = 'card',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-start gap-1.5 ${
        variant === 'block'
          ? 'rounded-card border border-dashed border-line-strong p-6'
          : 'flex-1 justify-center'
      }`}
    >
      {icon}
      <p className={variant === 'block' ? 'text-title-18' : 'font-semibold'}>{title}</p>
      {description ? <p className="max-w-[70ch] text-body-14 text-fg-2">{description}</p> : null}
      {action ? (
        <Link
          href={action.href}
          className={`mt-1 ${buttonClasses({ variant: action.primary ? 'primary' : 'quiet' })} ${
            // Aligns the quiet link text with the description above.
            action.primary ? '' : '-ml-2'
          }`}
        >
          {action.label}
        </Link>
      ) : null}
      {children ? <div className="mt-1 flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}
