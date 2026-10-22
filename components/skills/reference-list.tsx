'use client';

import {
  createContext,
  use,
  useDeferredValue,
  useId,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { setReferenceFlag } from '@/app/(app)/career/profile/skill-actions';
import { SearchIcon, StarIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { HabitCheckbox } from '@/components/ui/checkbox';
import { Chip } from '@/components/ui/chip';
import {
  groupReference,
  REFERENCE_FILTERS,
  type ReferenceFilter,
  type ReferenceRow,
} from '@/lib/skills/reference/list';

type Flag = 'known' | 'favorite';
type Change = { id: string; flag: Flag; value: boolean };

type ReferenceState = {
  rows: ReferenceRow[];
  setFlag: (id: string, flag: Flag, value: boolean) => void;
};

const ReferenceContext = createContext<ReferenceState | null>(null);

function useReference(): ReferenceState {
  const state = use(ReferenceContext);
  if (!state) throw new Error('useReference outside ReferenceProvider');
  return state;
}

// « Je connais » and favourites, shared by the list and the detail (optimistic).
export function ReferenceProvider({
  rows,
  children,
}: {
  rows: ReferenceRow[];
  children: ReactNode;
}) {
  const [optimisticRows, apply] = useOptimistic(rows, (current, change: Change) =>
    current.map((row) => (row.id === change.id ? { ...row, [change.flag]: change.value } : row))
  );
  const [, startTransition] = useTransition();

  return (
    <ReferenceContext
      value={{
        rows: optimisticRows,
        setFlag(id, flag, value) {
          startTransition(async () => {
            apply({ id, flag, value });
            await setReferenceFlag(id, flag, value);
          });
        },
      }}
    >
      {children}
    </ReferenceContext>
  );
}

// « Je connais » and the favourite star in the detail of an entry.
export function EntryToggles({ entryId }: { entryId: string }) {
  const { rows, setFlag } = useReference();
  const row = rows.find((item) => item.id === entryId);
  if (!row) return null;
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="icon"
        aria-pressed={row.favorite}
        aria-label="Favori"
        onClick={() => setFlag(row.id, 'favorite', !row.favorite)}
      >
        <StarIcon className={`size-4 ${row.favorite ? 'fill-career text-career' : ''}`} />
      </Button>
      <HabitCheckbox
        label="Je connais"
        checked={row.known}
        onChange={(event) => setFlag(row.id, 'known', event.target.checked)}
      />
    </div>
  );
}

// Left column of the « Référence » tab: search, filter chips, groups with known / total.
export function ReferenceList({
  skillSlug,
  selectedId,
  searchLabel,
  groupOrder,
}: {
  skillSlug: string;
  // Display order of the groups (CSS); others are sorted by size.
  groupOrder?: string[];
  selectedId: string | null;
  // « Rechercher une propriété »
  searchLabel: string;
}) {
  const { rows, setFlag } = useReference();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ReferenceFilter>('common');
  const [showDeprecated, setShowDeprecated] = useState(false);
  // Typing stays fluid on a list of 500+ rows.
  const deferredQuery = useDeferredValue(query);
  const groups = groupReference(rows, { query: deferredQuery, filter, showDeprecated }, groupOrder);
  const hasDeprecated = rows.some((row) => row.isDeprecated);
  const visible = groups.reduce((sum, group) => sum + group.rows.length, 0);
  const id = useId();
  const basePath = `/career/profile/${skillSlug}/reference`;

  return (
    <section
      aria-label="Liste de référence"
      className="flex flex-col gap-2 rounded-card bg-surface-default p-2.5"
    >
      <div className="flex flex-col gap-2 px-1 pt-1">
        <label htmlFor={`${id}-search`} className="sr-only">
          {searchLabel}
        </label>
        <div role="search" className="relative">
          <SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-fg-3" />
          <input
            id={`${id}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchLabel}
            className="h-9 w-full rounded-control border border-line-strong bg-surface-sunken pr-3 pl-8 text-body-14"
          />
        </div>
        <div role="group" aria-label="Filtrer" className="flex flex-wrap gap-1.5">
          {REFERENCE_FILTERS.map((option) => (
            <Chip
              key={option.value}
              pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Chip>
          ))}
        </div>
        {hasDeprecated ? (
          <label className="flex items-center gap-2 text-caption-12 text-fg-2">
            <input
              type="checkbox"
              checked={showDeprecated}
              onChange={(event) => setShowDeprecated(event.target.checked)}
              className="size-4 accent-career"
            />
            Afficher les obsolètes
          </label>
        ) : null}
        <p role="status" className="text-caption-12 text-fg-3 tabular">
          {visible} résultat{visible > 1 ? 's' : ''}
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-start gap-2 px-2 py-4">
          <p className="text-body-14 text-fg-2">Aucune entrée ne correspond.</p>
          <Button
            variant="quiet"
            className="-ml-2"
            onClick={() => {
              setQuery('');
              setFilter('all');
            }}
          >
            Tout afficher
          </Button>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.name} aria-label={group.name}>
            <h3 className="flex px-2 pt-2.5 pb-1 text-label-12 text-fg-3 uppercase">
              <span className="flex-1">{group.name}</span>
              <span className="font-medium normal-case tabular">
                {group.known} / {group.total}
                <span className="sr-only"> connues</span>
              </span>
            </h3>
            <ul>
              {group.rows.map((row) => {
                const isSelected = row.id === selectedId;
                return (
                  <li
                    key={row.id}
                    className={`flex items-center gap-1 rounded-control pl-1 ${
                      isSelected ? 'bg-surface-raised' : 'hover:bg-surface-raised'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={row.known}
                      onChange={(event) => setFlag(row.id, 'known', event.target.checked)}
                      aria-label={`Je connais ${row.name}`}
                      className="m-1.5 size-4 shrink-0 accent-habits"
                    />
                    <Link
                      href={`${basePath}?entry=${row.id}`}
                      scroll={false}
                      prefetch={false}
                      aria-current={isSelected ? 'true' : undefined}
                      className="grid min-w-0 flex-1 grid-cols-[minmax(0,11rem)_minmax(0,1fr)] items-center gap-2.5 rounded-control py-1.5 pr-2 text-caption-12 text-fg-2"
                    >
                      <code className="truncate font-mono font-semibold text-fg-1">
                        {row.name}
                        {row.isDeprecated ? <span className="sr-only"> (obsolète)</span> : null}
                      </code>
                      <span className="truncate">
                        {row.isDeprecated ? (
                          <span aria-hidden="true" className="text-fg-3">
                            obsolète ·{' '}
                          </span>
                        ) : null}
                        {row.favorite ? <span className="sr-only">Favori. </span> : null}
                        {row.summary ?? ''}
                      </span>
                    </Link>
                    {row.favorite ? (
                      <StarIcon
                        aria-hidden="true"
                        className="mr-2 size-3.5 shrink-0 fill-career text-career"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </section>
  );
}
