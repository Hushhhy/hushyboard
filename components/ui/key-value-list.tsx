import type { ReactNode } from 'react';

export type KeyValueItem = { key: string; label: string; value: ReactNode };

// Key/value rows (profile identity, application detail): a real <dl>.
export function KeyValueList({
  items,
  className = '',
}: {
  items: KeyValueItem[];
  className?: string;
}) {
  return (
    <dl
      className={`grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-body-14 ${className}`}
    >
      {items.map((item) => (
        <div key={item.key} className="contents">
          <dt className="text-fg-3">{item.label}</dt>
          <dd className="min-w-0 text-fg-1">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
