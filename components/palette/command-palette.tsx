'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { Command, useCommandState } from 'cmdk';
import { setCheckIn } from '@/app/(app)/habits/actions';
import { CheckIcon, HabitsIcon, PlusIcon, SearchIcon } from '@/components/icons';
import { useRewards } from '@/components/rewards/rewards-provider';
import { Button } from '@/components/ui/button';
import { PALETTE_ADD, PALETTE_PAGES, paletteScore } from '@/lib/palette';

const OPEN_EVENT = 'hushyboard:open-palette';

export type PaletteHabit = { id: string; name: string; done: boolean };

// "⌘K" on a Mac, "Ctrl K" elsewhere (read after hydration).
function useShortcutLabel(): string {
  const isMac = useSyncExternalStore(
    () => () => {},
    () => /Mac|iPhone|iPad/.test(navigator.platform),
    () => false
  );
  return isMac ? '⌘K' : 'Ctrl K';
}

// Fake search field of the top bar: opens the palette.
export function PaletteTrigger() {
  const shortcut = useShortcutLabel();
  return (
    <button
      type="button"
      aria-keyshortcuts="Meta+K Control+K"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="hidden h-9 w-75 shrink-0 items-center gap-2 rounded-control border border-line-subtle bg-surface-default px-3 text-body-14 text-fg-3 transition-colors duration-(--duration-tick) hover:border-line-strong hover:text-fg-2 md:flex"
    >
      <SearchIcon className="size-4" />
      <span className="flex-1 text-left">Cocher, ajouter, aller à…</span>
      <kbd className="rounded-pill border border-line-subtle bg-surface-overlay px-1.5 font-sans text-caption-12 text-fg-2">
        {shortcut}
      </kbd>
    </button>
  );
}

// Spoken number of results (« 3 commandes »).
function ResultCount() {
  const count = useCommandState((state) => state.filtered.count);
  return (
    <span role="status" className="sr-only">
      {count === 0 ? 'Aucune commande' : `${count} commande${count > 1 ? 's' : ''}`}
    </span>
  );
}

const ITEM =
  'flex h-9 cursor-pointer items-center gap-2 rounded-control px-3 text-body-14 text-fg-2 data-[selected=true]:bg-surface-control data-[selected=true]:text-fg-1';

// ⌘K / Ctrl+K palette: tick a habit, add something, go to a page, without the mouse.
// A native modal <dialog> (focus trap, Escape, inert page) with cmdk inside for the
// combobox, the keyboard and the filtering.
export function CommandPalette({ habits }: { habits: PaletteHabit[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<{ message: string; undo?: () => void } | null>(null);
  const router = useRouter();
  const { announce } = useRewards();

  const open = useCallback(() => {
    setSearch('');
    setIsOpen(true);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (dialogRef.current?.open) setIsOpen(false);
        else open();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(OPEN_EVENT, open);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(OPEN_EVENT, open);
    };
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // The browser gives focus back to the element that opened the dialog when it closes.
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  function run(action: () => void) {
    setIsOpen(false);
    setStatus(null);
    action();
  }

  async function toggleHabit(habit: PaletteHabit, done: boolean) {
    const { rewards } = await setCheckIn(habit.id, done);
    if (rewards.length > 0) announce(rewards);
    setStatus({
      message: `« ${habit.name} » ${done ? 'cochée' : 'décochée'} pour aujourd’hui.`,
      undo: () => {
        setStatus(null);
        void setCheckIn(habit.id, !done);
      },
    });
  }

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-label="Palette de commandes"
        onClose={() => setIsOpen(false)}
        onClick={(event) => {
          // A click on the scrim (outside the box) closes.
          if (event.target === event.currentTarget) setIsOpen(false);
        }}
        className="mx-auto mt-[12vh] w-140 max-w-[calc(100vw-2rem)] animate-palette-in overflow-hidden rounded-panel bg-surface-overlay p-0 text-fg-1 shadow-overlay backdrop:bg-scrim"
      >
        {isOpen ? (
          <Command label="Palette de commandes" filter={paletteScore} loop>
            <div className="flex items-center gap-2 border-b border-line-subtle px-4">
              <SearchIcon className="size-4 shrink-0 text-fg-3" />
              <Command.Input
                autoFocus
                value={search}
                onValueChange={setSearch}
                placeholder="Cocher, ajouter, aller à…"
                className="h-13 w-full bg-transparent text-body-16 text-fg-1 outline-none placeholder:text-fg-3"
              />
            </div>
            <ResultCount />
            <Command.List
              label="Commandes"
              className="max-h-[min(60vh,26rem)] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-label-12 [&_[cmdk-group-heading]]:text-fg-3 [&_[cmdk-group-heading]]:uppercase"
            >
              <Command.Empty className="px-3 py-6 text-center text-body-14 text-fg-2">
                Aucune commande. Essaie « cocher » ou « dépense ».
              </Command.Empty>
              {habits.length > 0 ? (
                <Command.Group heading="Habitudes du jour">
                  {habits.map((habit) => (
                    <Command.Item
                      key={habit.id}
                      value={`${habit.done ? 'Décocher' : 'Cocher'} ${habit.name}`}
                      keywords={['habitude']}
                      onSelect={() => run(() => void toggleHabit(habit, !habit.done))}
                      className={ITEM}
                    >
                      {habit.done ? (
                        <CheckIcon className="size-4 text-habits" />
                      ) : (
                        <HabitsIcon className="size-4 text-habits" />
                      )}
                      {habit.done ? 'Décocher' : 'Cocher'} « {habit.name} »
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}
              <Command.Group heading="Ajouter">
                {PALETTE_ADD.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={item.label}
                    keywords={item.keywords}
                    onSelect={() => run(() => router.push(item.href))}
                    className={ITEM}
                  >
                    <PlusIcon className="size-4" />
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>
              <Command.Group heading="Aller à">
                {PALETTE_PAGES.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={`Aller à ${item.label}`}
                    keywords={item.keywords}
                    onSelect={() => run(() => router.push(item.href))}
                    className={ITEM}
                  >
                    <span aria-hidden="true" className="w-4 text-center text-fg-3">
                      →
                    </span>
                    {item.label}
                  </Command.Item>
                ))}
              </Command.Group>
            </Command.List>
            <p className="border-t border-line-subtle px-4 py-2 text-caption-12 text-fg-3">
              ↑ ↓ choisir · ↵ valider · Échap fermer
            </p>
          </Command>
        ) : null}
      </dialog>

      {/* Undoable feedback of a palette action, until the next one (no timer). */}
      <div
        role="status"
        className="fixed bottom-4 left-1/2 z-40 w-max max-w-[calc(100vw-2rem)] -translate-x-1/2"
      >
        {status ? (
          <div className="flex items-center gap-1 rounded-panel bg-surface-overlay py-1.5 pr-1.5 pl-4 text-body-14 text-fg-2 shadow-overlay">
            <span>{status.message}</span>
            {status.undo ? (
              <Button variant="quiet" small onClick={status.undo}>
                Annuler
              </Button>
            ) : null}
            <Button variant="quiet" small onClick={() => setStatus(null)}>
              Fermer
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
