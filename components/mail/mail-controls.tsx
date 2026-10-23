'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  archiveSender,
  classifyMessages,
  createLabel,
  decideMatch,
  disconnectGmail,
  fileMessage,
  markRead,
  unsubscribe,
} from '@/app/(app)/mail/actions';
import { CheckIcon, PlusIcon, SparkleIcon } from '@/components/icons';
import { levelUpReward } from '@/components/rewards/use-form-done';
import { useRewards } from '@/components/rewards/rewards-provider';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { TextField } from '@/components/ui/text-field';
import { UndoStatus } from '@/components/ui/undo-status';
import { NEW_LABEL_COLORS, type LabelTone } from '@/lib/gmail/labels';
import { TONE_DOTS } from './tones';

const NETWORK = 'La requête n’a pas abouti. Réessaie.';

// Opening a mail marks it as read (once per mail).
export function MarkRead({ id }: { id: string }) {
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (done.current === id) return;
    done.current = id;
    void markRead(id).catch(() => {});
  }, [id]);
  return null;
}

// Recruiter replies are classified after the list is shown (Gemini, a few per visit).
const asked = new Set<string>();
export function ClassifyMessages({ ids }: { ids: string[] }) {
  const key = ids.join(',');
  useEffect(() => {
    if (!key || asked.has(key)) return;
    asked.add(key);
    void classifyMessages(key.split(',')).catch(() => {});
  }, [key]);
  return null;
}

type Label = { id: string; name: string; tone: LabelTone };

// « Ranger dans… »: a menu of labels; filing archives the mail, with « Annuler ».
export function FileMenu({
  messageId,
  labels,
  current,
  newLabelHref,
}: {
  messageId: string;
  labels: Label[];
  current: string[];
  newLabelHref: string;
}) {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState<Label | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const menuId = useId();
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === 'Escape'
          : !wrapper.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  function file(label: Label, undo = false) {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      try {
        const result = await fileMessage(messageId, label.id, undo);
        if (result.error) return setError(result.error);
        setLast(undo ? null : label);
      } catch {
        setError(NETWORK);
      }
    });
  }

  return (
    <div ref={wrapper} className="relative flex flex-col gap-1">
      <Button
        aria-expanded={open}
        aria-controls={menuId}
        pending={isPending}
        onClick={() => setOpen((value) => !value)}
      >
        Ranger dans…
      </Button>
      {open ? (
        <ul
          id={menuId}
          className="absolute top-10 left-0 z-20 flex w-60 flex-col rounded-control bg-surface-overlay p-1 shadow-overlay"
        >
          {labels.map((label) => {
            const isCurrent = current.includes(label.id);
            return (
              <li key={label.id}>
                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => file(label)}
                  className="flex w-full items-center gap-2 rounded-tick px-2 py-1.5 text-left text-body-14 hover:bg-surface-control disabled:opacity-70"
                >
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-full ${TONE_DOTS[label.tone]}`}
                  />
                  <span className="flex-1 truncate">{label.name}</span>
                  {isCurrent ? (
                    <>
                      <CheckIcon className="size-4" />
                      <span className="sr-only">(déjà rangé ici)</span>
                    </>
                  ) : null}
                </button>
              </li>
            );
          })}
          <li className="mt-1 border-t border-line-subtle pt-1">
            <Link
              href={newLabelHref}
              scroll={false}
              className="flex items-center gap-2 rounded-tick px-2 py-1.5 text-body-14 text-fg-2 hover:bg-surface-control"
            >
              <PlusIcon className="size-4" />
              Nouveau libellé…
            </Link>
          </li>
        </ul>
      ) : null}
      <UndoStatus
        message={last ? `Rangé dans ${last.name}.` : null}
        onUndo={last ? () => file(last, true) : undefined}
      />
      {error ? <ErrorState title={error} announce /> : null}
    </div>
  );
}

// « Nouveau libellé » (side panel): name and colour, created in Gmail.
export function NewLabelForm({ closeHref }: { closeHref: string }) {
  const router = useRouter();
  const [tone, setTone] = useState<string>(NEW_LABEL_COLORS[0].tone);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const name = String(new FormData(event.currentTarget).get('name') ?? '');
        setError(null);
        startTransition(async () => {
          try {
            const result = await createLabel({ name, tone });
            if (result.error) return setError(result.error);
            router.replace(closeHref, { scroll: false });
          } catch {
            setError(NETWORK);
          }
        });
      }}
    >
      <TextField name="name" label="Nom" required maxLength={80} autoComplete="off" />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-body-14 font-medium">Couleur</legend>
        <div className="flex flex-wrap gap-2">
          {NEW_LABEL_COLORS.map((color) => (
            <label
              key={color.tone}
              className="flex cursor-pointer items-center gap-1.5 rounded-control border border-line-subtle px-2 py-1 text-caption-12 has-checked:border-line-strong has-checked:bg-surface-control"
            >
              <input
                type="radio"
                name="tone"
                value={color.tone}
                checked={tone === color.tone}
                onChange={() => setTone(color.tone)}
                className="sr-only"
              />
              <span aria-hidden="true" className={`size-3 rounded-tick ${TONE_DOTS[color.tone]}`} />
              {color.name}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-caption-12 text-fg-3">Le libellé est créé aussi dans Gmail.</p>
      {error ? <ErrorState title={error} announce /> : null}
      <Button type="submit" variant="primary" onOverlay pending={isPending} className="self-start">
        Créer
      </Button>
    </form>
  );
}

// « Se désabonner », then « Archiver ses N anciens mails ? ».
export function UnsubscribeButton({ messageId }: { messageId: string }) {
  const [state, setState] = useState<
    | { step: 'idle' }
    | { step: 'done'; sender: string; oldMails: number }
    | { step: 'link'; url: string }
    | { step: 'archived'; count: number }
  >({ step: 'idle' });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await unsubscribe(messageId);
        if (result.error) return setError(result.error);
        if (result.method === 'link' && result.url) {
          window.open(result.url, '_blank', 'noopener,noreferrer');
          setState({ step: 'link', url: result.url });
        } else {
          setState({ step: 'done', sender: result.sender ?? '', oldMails: result.oldMails ?? 0 });
        }
      } catch {
        setError(NETWORK);
      }
    });
  }

  function archive() {
    startTransition(async () => {
      try {
        const result = await archiveSender(messageId);
        if (result.error) return setError(result.error);
        setState({ step: 'archived', count: result.count ?? 0 });
      } catch {
        setError(NETWORK);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {state.step === 'idle' ? (
        <Button variant="quiet" pending={isPending} onClick={start}>
          Se désabonner
        </Button>
      ) : null}
      <div role="status" className="text-body-14 text-fg-2 empty:hidden">
        {state.step === 'done' ? (
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Désabonné de {state.sender}.
              {state.oldMails > 0
                ? ` Archiver ses ${state.oldMails} ancien${state.oldMails > 1 ? 's' : ''} mail${state.oldMails > 1 ? 's' : ''} ?`
                : ''}
            </span>
            {state.oldMails > 0 ? (
              <>
                <Button small pending={isPending} onClick={archive}>
                  Archiver
                </Button>
                <Button small variant="quiet" onClick={() => setState({ step: 'idle' })}>
                  Non merci
                </Button>
              </>
            ) : null}
          </div>
        ) : state.step === 'link' ? (
          <span>
            La page de désinscription s’est ouverte dans un nouvel onglet.{' '}
            <a href={state.url} target="_blank" rel="noreferrer noopener" className="underline">
              La rouvrir
            </a>
          </span>
        ) : state.step === 'archived' ? (
          <span>
            {state.count} mail{state.count > 1 ? 's' : ''} archivé{state.count > 1 ? 's' : ''}.
          </span>
        ) : null}
      </div>
      {error ? <ErrorState title={error} announce /> : null}
    </div>
  );
}

// Banner of a recruiter reply: Alex validates the change on the application.
export function RecruiterBanner({
  matchId,
  title,
  reason,
  suggestion,
}: {
  matchId: string;
  title: string;
  reason: string;
  suggestion: 'INTERVIEW' | 'REJECTION';
}) {
  const { announce } = useRewards();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(decision: 'HR_INTERVIEW' | 'REJECTED' | 'IGNORE') {
    setError(null);
    startTransition(async () => {
      try {
        const result = await decideMatch(matchId, decision);
        if (result.error) return setError(result.error);
        if (result.levelUp) announce(levelUpReward(result.levelUp));
        setStatus(
          decision === 'IGNORE'
            ? 'Réponse ignorée.'
            : `Candidature mise à jour : ${decision === 'HR_INTERVIEW' ? 'Entretien RH' : 'Refus'}.`
        );
      } catch {
        setError(NETWORK);
      }
    });
  }

  return (
    <section
      aria-label="Réponse de recruteur détectée"
      className="flex gap-3 rounded-card border border-career/40 bg-career-deep/40 p-4"
    >
      <SparkleIcon className="mt-0.5 size-5 shrink-0 text-career" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-semibold">{title}</p>
        <p className="text-body-14 text-fg-2">{reason} Mets à jour la candidature :</p>
        {status ? (
          <p role="status" className="text-body-14">
            {status}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              variant={suggestion === 'INTERVIEW' ? 'primary' : 'secondary'}
              pending={isPending}
              onClick={() => decide('HR_INTERVIEW')}
            >
              Marquer « Entretien RH »
            </Button>
            <Button
              variant={suggestion === 'REJECTION' ? 'primary' : 'secondary'}
              disabled={isPending}
              onClick={() => decide('REJECTED')}
            >
              Marquer « Refus »
            </Button>
            <Button variant="quiet" disabled={isPending} onClick={() => decide('IGNORE')}>
              Ignorer
            </Button>
          </div>
        )}
        {error ? <ErrorState title={error} announce /> : null}
      </div>
    </section>
  );
}

// « Déconnecter Gmail »: revokes the token.
export function DisconnectButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="quiet"
      small
      pending={isPending}
      onClick={() =>
        startTransition(async () => {
          await disconnectGmail();
          router.refresh();
        })
      }
    >
      Déconnecter Gmail
    </Button>
  );
}
