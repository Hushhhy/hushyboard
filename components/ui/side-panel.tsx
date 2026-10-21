'use client';

import { Suspense, useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CloseIcon } from '@/components/icons';
import { withSearchParam } from '@/lib/url';
import { Button } from './button';

type SidePanelProps = {
  // The panel is open when the URL has ?panel=<name>. Open it with a plain link to that URL.
  name: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  // Buttons at the bottom of the panel.
  footer?: ReactNode;
};

// Non-modal detail panel: no scrim, no focus trap, the page behind stays usable.
// Its state lives in the URL, so Back closes it and the link can be shared.
export function SidePanel(props: SidePanelProps) {
  // useSearchParams needs its own Suspense boundary so the rest of the page can be prerendered.
  return (
    <Suspense fallback={null}>
      <SidePanelContent {...props} />
    </Suspense>
  );
}

function SidePanelContent({ name, title, subtitle, children, footer }: SidePanelProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const isOpen = searchParams.get('panel') === name;

  const titleRef = useRef<HTMLHeadingElement>(null);
  // The element that opened the panel, to give focus back on close.
  const openerRef = useRef<HTMLElement | null>(null);
  const titleId = `panel-title-${name}`;

  useEffect(() => {
    if (!isOpen) return;
    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    titleRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  function close() {
    router.replace(withSearchParam(pathname, searchParams.toString(), 'panel', null), {
      scroll: false,
    });
    const opener = openerRef.current;
    if (opener?.isConnected) opener.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    }
  }

  return (
    <aside
      aria-labelledby={titleId}
      onKeyDown={handleKeyDown}
      className="fixed inset-y-3 right-3 z-30 flex w-100 max-w-[calc(100vw-1.5rem)] animate-panel-in flex-col gap-4 overflow-y-auto rounded-panel bg-surface-overlay p-4 shadow-overlay"
    >
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className="text-title-18">
            {title}
          </h2>
          {subtitle ? <p className="text-body-14 text-fg-2">{subtitle}</p> : null}
        </div>
        <Button
          variant="icon"
          aria-label="Fermer le panneau"
          onClick={close}
          className="bg-surface-raised"
        >
          <CloseIcon className="size-4" />
        </Button>
      </header>
      <div className="flex flex-1 flex-col gap-4">{children}</div>
      {footer ? <footer className="flex flex-wrap items-center gap-2">{footer}</footer> : null}
    </aside>
  );
}
