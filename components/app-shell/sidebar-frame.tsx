'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CareerIcon, CloseIcon, SearchIcon } from '@/components/icons';
import { openPalette } from '@/components/palette/command-palette';

// Desktop: the sidebar stays on the left. Below 768px it collapses into a top bar with a menu
// button that opens it as a drawer (closed by a link, Escape or a click on the scrim).
export function SidebarFrame({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Opening the drawer moves focus to its first link.
  useEffect(() => {
    if (isOpen) navRef.current?.querySelector<HTMLElement>('a')?.focus();
  }, [isOpen]);

  return (
    <>
      <div className="sticky top-0 z-30 flex h-13 items-center gap-2 border-b border-line-subtle bg-surface-sunken px-2 md:hidden">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="main-nav"
          onClick={() => setIsOpen((open) => !open)}
          className="grid size-9 place-items-center rounded-control text-fg-2 hover:bg-surface-raised hover:text-fg-1"
        >
          <span className="sr-only">Menu</span>
          {isOpen ? (
            <CloseIcon className="size-5" />
          ) : (
            <svg
              viewBox="0 0 20 20"
              aria-hidden="true"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />
            </svg>
          )}
        </button>
        <p className="flex flex-1 items-center gap-2 font-display text-display-20">
          <CareerIcon className="size-5 text-career" />
          Hushyboard
        </p>
        <button
          type="button"
          onClick={openPalette}
          className="grid size-9 place-items-center rounded-control text-fg-2 hover:bg-surface-raised hover:text-fg-1"
        >
          <span className="sr-only">Cocher, ajouter, aller à…</span>
          <SearchIcon className="size-5" />
        </button>
      </div>
      {isOpen ? (
        <div
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-scrim md:hidden"
        />
      ) : null}
      <aside
        ref={navRef}
        id="main-nav"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a')) setIsOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsOpen(false);
        }}
        className={`${
          isOpen ? 'flex' : 'hidden'
        } fixed inset-y-0 left-0 z-40 h-dvh w-61 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-line-subtle bg-surface-sunken px-3 pt-5 pb-4 md:sticky md:top-0 md:z-auto md:flex`}
      >
        {children}
      </aside>
    </>
  );
}
