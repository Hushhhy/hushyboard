'use client';

import { useActionState, useId, useState, useTransition } from 'react';
import {
  addPlayTime,
  saveGame,
  setGameStatus,
  stepProgress,
} from '@/app/(app)/leisure/games/actions';
import { useFormDone } from '@/components/rewards/use-form-done';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SelectField, TextField } from '@/components/ui/text-field';
import { EMPTY_FORM_STATE } from '@/lib/forms';
import {
  formatPlayTime,
  gameStatusLabel,
  gameStatusOptions,
  type GameStatusKey,
} from '@/lib/games';

export type GameFormValue = {
  id: string;
  title: string;
  franchise: string | null;
  storyOrder: number | null;
  setting: string | null;
  platform: string | null;
  status: GameStatusKey;
  endless: boolean;
  progressCurrent: number | null;
  progressTotal: number | null;
  minutesPlayed: number | null;
  coverUrl: string | null;
  notes: string | null;
};

// « Ajouter un jeu » and its edit form.
export function GameForm({
  game,
  franchises,
  defaultFranchise,
  closeHref,
}: {
  game: GameFormValue | null;
  franchises: string[];
  defaultFranchise: string | null;
  closeHref: string;
}) {
  const [state, formAction, isPending] = useActionState(saveGame, EMPTY_FORM_STATE);
  useFormDone(state, closeHref);
  const id = useId();
  const value = (name: string, fallback: string | number | null | undefined) =>
    state.values?.[name] ?? (fallback === null || fallback === undefined ? '' : String(fallback));
  // An endless game (MMO) has no « Terminé » and no progress; a game without a franchise has
  // no place in a story.
  const [endless, setEndless] = useState(
    state.values ? state.values.endless === 'on' : (game?.endless ?? false)
  );
  const [hasFranchise, setHasFranchise] = useState(
    Boolean(value('franchise', game ? game.franchise : defaultFranchise).trim())
  );
  const [status, setStatus] = useState<GameStatusKey>(
    (value('status', game?.status ?? 'NOT_STARTED') as GameStatusKey) || 'NOT_STARTED'
  );

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {state.error ? <ErrorState title={state.error} announce /> : null}
      {game ? <input type="hidden" name="id" value={game.id} /> : null}
      <TextField
        name="title"
        label="Titre"
        defaultValue={value('title', game?.title)}
        error={state.fieldErrors?.title}
      />
      <div className={`grid gap-3 ${hasFranchise ? 'grid-cols-[1fr_7rem]' : 'grid-cols-1'}`}>
        <TextField
          name="franchise"
          label="Franchise (facultatif)"
          list={`${id}-franchises`}
          autoComplete="off"
          placeholder="Assassin’s Creed"
          hint={hasFranchise ? undefined : 'Laisse vide pour un jeu à part.'}
          defaultValue={value('franchise', game ? game.franchise : defaultFranchise)}
          onChange={(event) => setHasFranchise(Boolean(event.target.value.trim()))}
          error={state.fieldErrors?.franchise}
        />
        {hasFranchise ? (
          <TextField
            name="storyOrder"
            label="Ordre"
            inputMode="numeric"
            hint="Dans l’histoire"
            defaultValue={value('storyOrder', game?.storyOrder)}
            error={state.fieldErrors?.storyOrder}
          />
        ) : null}
      </div>
      <datalist id={`${id}-franchises`}>
        {franchises.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="setting"
          label="Époque"
          placeholder="1715"
          defaultValue={value('setting', game?.setting)}
          error={state.fieldErrors?.setting}
        />
        <TextField
          name="platform"
          label="Plateforme"
          placeholder="PS5"
          defaultValue={value('platform', game?.platform)}
          error={state.fieldErrors?.platform}
        />
      </div>
      <label className="flex items-start gap-2 text-body-14">
        <input
          type="checkbox"
          name="endless"
          checked={endless}
          onChange={(event) => {
            setEndless(event.target.checked);
            if (event.target.checked && status === 'FINISHED') setStatus('DROPPED');
          }}
          className="mt-0.5 size-4 accent-leisure"
        />
        <span>
          <span className="font-medium">Jeu sans fin</span>
          <span className="block text-caption-12 text-fg-2">
            MMO, jeu en ligne : pas de fin ni d’avancée, seulement le temps de jeu.
          </span>
        </span>
      </label>
      <SelectField
        name="status"
        label="Statut"
        options={gameStatusOptions(endless).map((option) => ({
          value: option,
          label: gameStatusLabel(option, endless),
        }))}
        value={status}
        onChange={(event) => setStatus(event.target.value as GameStatusKey)}
        error={state.fieldErrors?.status}
      />
      <div className={`grid gap-3 ${endless ? 'grid-cols-1' : 'grid-cols-3'}`}>
        {endless ? null : (
          <>
            <TextField
              name="progressCurrent"
              label="Avancée"
              inputMode="numeric"
              placeholder="6"
              defaultValue={value('progressCurrent', game?.progressCurrent)}
              error={state.fieldErrors?.progressCurrent}
            />
            <TextField
              name="progressTotal"
              label="Sur"
              inputMode="numeric"
              placeholder="13"
              defaultValue={value('progressTotal', game?.progressTotal)}
              error={state.fieldErrors?.progressTotal}
            />
          </>
        )}
        <TextField
          name="playTime"
          label="Temps de jeu"
          placeholder="22 h"
          defaultValue={value(
            'playTime',
            game?.minutesPlayed ? formatPlayTime(game.minutesPlayed) : ''
          )}
          error={state.fieldErrors?.playTime}
        />
      </div>
      <TextField
        name="coverUrl"
        label="Image de la jaquette (facultatif)"
        placeholder="https://…"
        defaultValue={value('coverUrl', game?.coverUrl)}
        error={state.fieldErrors?.coverUrl}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-notes`} className="text-body-14 font-medium">
          Notes
        </label>
        <textarea
          id={`${id}-notes`}
          name="notes"
          rows={3}
          defaultValue={value('notes', game?.notes)}
          className="rounded-control border border-line-strong bg-surface-sunken px-3 py-2 text-body-14"
        />
      </div>
      <div className="mt-2">
        <Button type="submit" onOverlay pending={isPending}>
          {game ? 'Enregistrer' : 'Ajouter le jeu'}
        </Button>
      </div>
    </form>
  );
}

// Focal card of the game being played: finish, pause, +1 step, add a session's time.
export function CurrentGameControls({
  gameId,
  status,
  hasProgress,
  endless,
}: {
  gameId: string;
  status: GameStatusKey;
  hasProgress: boolean;
  endless: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [time, setTime] = useState('');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const id = useId();

  const act = (action: () => Promise<unknown>) =>
    startTransition(async () => void (await action()));

  return (
    <div className="flex flex-col items-stretch gap-2 sm:w-56">
      {status === 'PLAYING' && endless ? (
        <>
          <Button disabled={isPending} onClick={() => act(() => setGameStatus(gameId, 'PAUSED'))}>
            Mettre en pause
          </Button>
          <Button
            variant="quiet"
            disabled={isPending}
            onClick={() => act(() => setGameStatus(gameId, 'DROPPED'))}
          >
            Arrêter
          </Button>
        </>
      ) : status === 'PLAYING' ? (
        <>
          <Button
            variant="primary"
            pending={isPending}
            onClick={() => act(() => setGameStatus(gameId, 'FINISHED'))}
          >
            Terminé
          </Button>
          <Button
            variant="quiet"
            disabled={isPending}
            onClick={() => act(() => setGameStatus(gameId, 'PAUSED'))}
          >
            Mettre en pause
          </Button>
        </>
      ) : (
        <Button
          variant="primary"
          pending={isPending}
          onClick={() => act(() => setGameStatus(gameId, 'PLAYING'))}
        >
          {status === 'NOT_STARTED' ? 'Commencer' : 'Reprendre'}
        </Button>
      )}
      {hasProgress ? (
        <Button disabled={isPending} onClick={() => act(() => stepProgress(gameId, 1))}>
          +1 dans l’avancée
        </Button>
      ) : null}
      <form
        className="flex gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          startTransition(async () => {
            const result = await addPlayTime(gameId, time);
            if (result.error) setMessage({ text: result.error, error: true });
            else {
              setMessage({ text: 'Temps ajouté.', error: false });
              setTime('');
            }
          });
        }}
      >
        <label htmlFor={id} className="sr-only">
          Temps de la session
        </label>
        <input
          id={id}
          value={time}
          onChange={(event) => setTime(event.target.value)}
          placeholder="1 h 30"
          className="h-8 min-w-0 flex-1 rounded-control border border-line-subtle bg-surface-sunken px-2 text-body-14"
        />
        <Button
          type="submit"
          // For an endless game being played, adding time is the main action of the card.
          variant={endless && status === 'PLAYING' ? 'primary' : 'quiet'}
          small
          disabled={!time.trim() || isPending}
        >
          Ajouter du temps
        </Button>
      </form>
      {message ? (
        message.error ? (
          <ErrorState title={message.text} announce />
        ) : (
          <p role="status" className="text-caption-12 text-fg-3">
            {message.text}
          </p>
        )
      ) : null}
    </div>
  );
}
