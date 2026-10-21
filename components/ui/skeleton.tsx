import type { ReactNode } from 'react';

// A static placeholder block, sized like the real content. No shimmer, by design.
// "raised" = a line of text inside a card; "card" = a whole card shape on the page background.
export function Skeleton({
  className = '',
  surface = 'raised',
}: {
  className?: string;
  surface?: 'raised' | 'card';
}) {
  const fill =
    surface === 'card' ? 'rounded-card bg-surface-default' : 'rounded-tick bg-surface-raised';
  return <span aria-hidden="true" className={`block ${fill} ${className}`} />;
}

// Area that is loading: busy for assistive tech, with a spoken label.
export function LoadingRegion({
  label,
  children,
  className = '',
}: {
  // "Chargement des finances…"
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
