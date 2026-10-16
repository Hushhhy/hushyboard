import type { ReactNode } from 'react';

type ModuleCardProps = {
  title: string;
  icon?: ReactNode;
  // Text color class of the domain (e.g. "text-career") applied to the icon.
  accentClass?: string;
  aside?: ReactNode;
  // The focal module is raised (lighter surface + shadow). Only one per screen.
  focal?: boolean;
  className?: string;
  children: ReactNode;
};

export function ModuleCard({
  title,
  icon,
  accentClass = 'text-fg-3',
  aside,
  focal = false,
  className = '',
  children,
}: ModuleCardProps) {
  return (
    <section
      aria-label={title}
      className={`flex min-w-0 flex-col gap-2.5 rounded-card px-4.5 py-4 ${
        focal ? 'bg-surface-raised px-6 py-5 shadow-raised' : 'bg-surface-default'
      } ${className}`}
    >
      <h2 className="flex items-center gap-2 text-label-12 text-fg-3 uppercase">
        {icon ? <span className={accentClass}>{icon}</span> : null}
        <span className="flex-1">{title}</span>
        {aside ? (
          <span className="text-caption-12 normal-case tracking-normal">{aside}</span>
        ) : null}
      </h2>
      {children}
    </section>
  );
}
