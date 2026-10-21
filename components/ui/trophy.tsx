import type { ComponentProps, ReactNode } from 'react';
import { LockIcon } from '@/components/icons';
import { DOMAIN_CLASSES, type Domain } from './domain';

const HEXAGON = 'M22 2 41 13v22L22 46 3 35V13z';

type TrophyProps = Omit<ComponentProps<'button'>, 'children'> & {
  name: string;
  domain: Domain;
  // Unlocked: date or feat ("15 oct."); locked: the condition ("Décroche une première offre").
  detail: string;
  unlocked: boolean;
  // Pictogram drawn inside the emblem (an icon from components/icons).
  icon: ReactNode;
};

// A trophy (all areas, no XP). A button: it opens the detail panel.
export function Trophy({
  name,
  domain,
  detail,
  unlocked,
  icon,
  className = '',
  ...props
}: TrophyProps) {
  const colors = DOMAIN_CLASSES[domain];
  return (
    <button
      type="button"
      className={`group flex w-full items-center gap-2 rounded-control p-2 text-left transition-colors duration-(--duration-change) hover:bg-surface-raised ${className}`}
      {...props}
    >
      <span
        aria-hidden="true"
        className="relative grid h-11 w-10 shrink-0 place-items-center transition-transform duration-(--duration-change) ease-spring group-hover:-translate-y-0.75"
      >
        <svg viewBox="0 0 44 48" className="absolute inset-0 size-full">
          {unlocked ? (
            <path
              d={HEXAGON}
              className={`${colors.deepFill} ${colors.stroke}`}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d={HEXAGON}
              className="fill-none stroke-line-strong"
              strokeWidth="1.6"
              strokeDasharray="4 3"
              strokeLinejoin="round"
            />
          )}
        </svg>
        <span className={`relative ${unlocked ? colors.text : 'text-fg-3'}`}>
          {unlocked ? icon : <LockIcon className="size-4" />}
        </span>
      </span>
      <span className="min-w-0">
        <span
          className={`block truncate text-body-14 font-semibold ${unlocked ? '' : 'text-fg-2'}`}
        >
          {unlocked ? null : <span className="sr-only">Verrouillé : </span>}
          {name}
        </span>
        <span className={`block text-caption-12 ${unlocked ? 'text-fg-2' : 'text-fg-3'}`}>
          {detail}
        </span>
      </span>
    </button>
  );
}

// Shelf of trophies: a list on a 2px rule.
export function TrophyShelf({ children }: { children: ReactNode }) {
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2 border-b-2 border-surface-overlay pb-2">
      {children}
    </ul>
  );
}
