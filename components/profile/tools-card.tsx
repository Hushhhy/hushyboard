'use client';

import { useEffect, useId, useOptimistic, useRef, useState, useTransition } from 'react';
import type { Tool, ToolStatus } from '@/generated/prisma/client';
import {
  addTool,
  removeTool,
  restoreTool,
  setToolStatus,
  type RemovedTool,
} from '@/app/(app)/career/profile/actions';
import { CheckIcon, PlusIcon, ToolsIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Chip, type ChipTone } from '@/components/ui/chip';
import { FieldError } from '@/components/ui/error-state';
import { UndoStatus } from '@/components/ui/undo-status';

const STATUSES: { value: ToolStatus; label: string; tone: ChipTone }[] = [
  { value: 'DISCOVERED', label: 'Découvert', tone: 'neutral' },
  { value: 'USING', label: "J'utilise", tone: 'info' },
  { value: 'MASTERED', label: 'Maîtrisé', tone: 'success' },
];

const statusOf = (value: ToolStatus) => STATUSES.find((status) => status.value === value)!;

type OptimisticChange =
  { type: 'status'; id: string; status: ToolStatus } | { type: 'remove'; id: string };

export function ToolsCard({ tools }: { tools: Tool[] }) {
  const [optimisticTools, applyChange] = useOptimistic(
    tools,
    (current, change: OptimisticChange) =>
      change.type === 'remove'
        ? current.filter((tool) => tool.id !== change.id)
        : current.map((tool) => (tool.id === change.id ? { ...tool, status: change.status } : tool))
  );
  const [, startTransition] = useTransition();
  const [undo, setUndo] = useState<{ message: string; removed: RemovedTool } | null>(null);

  function changeStatus(tool: Tool, status: ToolStatus) {
    setUndo(null);
    startTransition(async () => {
      applyChange({ type: 'status', id: tool.id, status });
      await setToolStatus(tool.id, status);
    });
  }

  function remove(tool: Tool) {
    startTransition(async () => {
      applyChange({ type: 'remove', id: tool.id });
      const removed = await removeTool(tool.id);
      if (removed) setUndo({ message: `${tool.name} retiré.`, removed });
    });
  }

  function restore() {
    if (!undo) return;
    const { removed } = undo;
    setUndo(null);
    startTransition(async () => {
      await restoreTool(removed);
    });
  }

  return (
    <section
      aria-labelledby="tools-title"
      className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
    >
      <h2 id="tools-title" className="flex items-center gap-2 text-label-12 text-fg-3 uppercase">
        <ToolsIcon className="size-4" />
        <span className="flex-1">Logiciels et outils</span>
        <span className="text-caption-12 tracking-normal normal-case tabular">
          {optimisticTools.length}
        </span>
      </h2>

      <ul aria-label="Légende" className="flex flex-wrap gap-3 text-caption-12 text-fg-2">
        {STATUSES.map((status) => (
          <li key={status.value} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${
                status.tone === 'neutral'
                  ? 'bg-fg-3'
                  : status.tone === 'info'
                    ? 'bg-info'
                    : 'bg-success'
              }`}
            />
            {status.label}
          </li>
        ))}
      </ul>

      <ul className="flex flex-wrap gap-1.5">
        {optimisticTools.map((tool) => (
          <li key={tool.id}>
            <ToolChip
              tool={tool}
              onStatus={(status) => changeStatus(tool, status)}
              onRemove={() => remove(tool)}
            />
          </li>
        ))}
      </ul>

      <UndoStatus message={undo?.message ?? null} onUndo={restore} focusUndo />
      <AddTool onAdded={() => setUndo(null)} />
    </section>
  );
}

// A tool chip that opens a small menu: change the status or remove the tool.
function ToolChip({
  tool,
  onStatus,
  onRemove,
}: {
  tool: Tool;
  onStatus: (status: ToolStatus) => void;
  onRemove: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const status = statusOf(tool.status);

  // Close on a click outside.
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && isOpen) {
          event.stopPropagation();
          close();
        }
      }}
    >
      <Chip
        ref={triggerRef}
        tone={status.tone}
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen((open) => !open)}
      >
        {tool.name}
        <span className="sr-only">, {status.label}</span>
      </Chip>
      {isOpen ? (
        <div
          id={menuId}
          className="absolute top-full left-0 z-20 mt-1 flex w-44 animate-palette-in flex-col gap-0.5 rounded-control bg-surface-overlay p-1 shadow-overlay"
        >
          {STATUSES.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={option.value === tool.status}
              onClick={() => {
                onStatus(option.value);
                close();
              }}
              className="flex h-8 items-center gap-2 rounded-control px-2 text-left text-body-14 text-fg-2 hover:bg-surface-control hover:text-fg-1 aria-pressed:font-semibold aria-pressed:text-fg-1"
            >
              <span className="w-3.5">
                {option.value === tool.status ? <CheckIcon className="size-3.5" /> : null}
              </span>
              {option.label}
            </button>
          ))}
          <span aria-hidden="true" className="my-0.5 h-px bg-line-subtle" />
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onRemove();
            }}
            className="flex h-8 items-center gap-2 rounded-control px-2 text-left text-body-14 text-fg-2 hover:bg-surface-control hover:text-fg-1"
          >
            <span aria-hidden="true" className="w-3.5" />
            Retirer
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AddTool({ onAdded }: { onAdded: () => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputId = useId();

  if (!isAdding) {
    return (
      <Button variant="quiet" className="-ml-2 self-start" onClick={() => setIsAdding(true)}>
        <PlusIcon className="size-4" />
        Ajouter un outil
      </Button>
    );
  }

  function submit() {
    startTransition(async () => {
      const result = await addTool(name);
      if (result.error) {
        setError(result.error);
      } else {
        setName('');
        setError(null);
        onAdded();
      }
    });
  }

  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        Nom de l&apos;outil
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          autoFocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsAdding(false);
          }}
          placeholder="Nom de l'outil, par exemple Postman"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className="h-9 min-w-0 flex-1 rounded-control border border-line-strong bg-surface-sunken px-3 text-body-14"
        />
        <Button type="submit" pending={isPending}>
          Ajouter
        </Button>
        <Button variant="quiet" onClick={() => setIsAdding(false)}>
          Fermer
        </Button>
      </div>
      {error ? <FieldError id={`${inputId}-error`}>{error}</FieldError> : null}
    </form>
  );
}
