'use client';

import { useId, useState, useTransition } from 'react';
import { saveNotionNotes } from '@/app/(app)/career/profile/skill-actions';

// « Mes notes » of a notion: free text, saved when the field loses focus.
export function NotesField({ notionId, initial }: { notionId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState('');
  const [, startTransition] = useTransition();
  const id = useId();

  function save(text: string) {
    if (text.trim() === saved.trim()) return;
    startTransition(async () => {
      try {
        await saveNotionNotes(notionId, text);
        setSaved(text);
        setStatus('Notes enregistrées.');
      } catch {
        setStatus('Les notes n’ont pas pu être enregistrées. Réessaie.');
      }
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label-12 text-fg-3 uppercase">
        Mes notes
      </label>
      <textarea
        id={id}
        value={value}
        maxLength={5000}
        rows={3}
        onChange={(event) => {
          setValue(event.target.value);
          setStatus('');
        }}
        onBlur={(event) => save(event.currentTarget.value)}
        placeholder="Où tu l’as utilisé, ce qui t’a bloqué…"
        className="min-h-20 rounded-control border border-line-subtle bg-surface-sunken px-3 py-2 text-body-14 placeholder:text-fg-3"
      />
      <p role="status" className="min-h-4 text-caption-12 text-fg-3">
        {status}
      </p>
    </div>
  );
}
