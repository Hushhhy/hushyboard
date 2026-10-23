'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { fieldErrors, formValues, type FormState } from '@/lib/forms';
import { GAME_STATUSES, parsePlayTime, type GameStatusKey } from '@/lib/games';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

// Video games. No XP for leisure.

function revalidateGames() {
  revalidatePath('/leisure/games');
  revalidatePath('/');
}

async function ownedGame(userId: string, gameId: string) {
  const game = await prisma.game.findFirst({ where: { id: gameId, userId } });
  if (!game) throw new Error('Game not found');
  return game;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères au maximum.`)
    .transform((value) => value || null);

const optionalInt = (label: string) =>
  z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d{1,5}$/.test(value), `${label} : un nombre entier.`)
    .transform((value) => (value === '' ? null : Number(value)));

const gameSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().trim().min(1, 'Indique le titre du jeu.').max(160),
    franchise: optionalText(80),
    storyOrder: optionalInt('Ordre'),
    setting: optionalText(60),
    platform: optionalText(40),
    status: z.enum(GAME_STATUSES as [GameStatusKey, ...GameStatusKey[]]),
    progressCurrent: optionalInt('Avancée'),
    progressTotal: optionalInt('Total'),
    playTime: z
      .string()
      .trim()
      .refine(
        (value) => value === '' || parsePlayTime(value) !== null,
        'Écris par exemple « 22 h » ou « 1 h 30 ».'
      ),
    coverUrl: z
      .string()
      .trim()
      .max(500)
      .refine((value) => !value || /^https:\/\/\S+$/.test(value), 'Une adresse en https://')
      .transform((value) => value || null),
    notes: optionalText(2000),
  })
  .refine(
    (data) =>
      data.progressCurrent === null ||
      data.progressTotal === null ||
      data.progressCurrent <= data.progressTotal,
    { path: ['progressCurrent'], message: 'L’avancée dépasse le total.' }
  );

// Dates follow the status: started on the first « En cours », finished on « Terminé ».
function datesFor(
  status: GameStatusKey,
  current: { startedAt: Date | null; finishedAt: Date | null } | null
) {
  const now = new Date();
  return {
    startedAt:
      status === 'NOT_STARTED'
        ? null
        : (current?.startedAt ?? (status === 'PLAYING' || status === 'FINISHED' ? now : null)),
    finishedAt: status === 'FINISHED' ? (current?.finishedAt ?? now) : null,
  };
}

// « Ajouter un jeu » and its edit form.
export async function saveGame(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = gameSchema.safeParse({
    franchise: '',
    storyOrder: '',
    setting: '',
    platform: '',
    progressCurrent: '',
    progressTotal: '',
    playTime: '',
    coverUrl: '',
    notes: '',
    ...values,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { id, playTime, ...data } = parsed.data;
  const minutesPlayed = playTime ? parsePlayTime(playTime) : null;
  if (id) {
    const game = await ownedGame(user.id, id);
    await prisma.game.update({
      where: { id: game.id },
      data: { ...data, minutesPlayed, ...datesFor(data.status, game) },
    });
  } else {
    await prisma.game.create({
      data: { ...data, minutesPlayed, userId: user.id, ...datesFor(data.status, null) },
    });
  }
  revalidateGames();
  return { done: Date.now() };
}

// « Terminé », « Mettre en pause », « Reprendre », « Commencer ».
export async function setGameStatus(gameId: string, status: GameStatusKey): Promise<void> {
  const user = await requireUser();
  const next = z.enum(GAME_STATUSES as [GameStatusKey, ...GameStatusKey[]]).parse(status);
  const game = await ownedGame(user.id, gameId);
  await prisma.game.update({
    where: { id: game.id },
    data: {
      status: next,
      ...datesFor(next, game),
      // A finished game is at its last step.
      ...(next === 'FINISHED' && game.progressTotal ? { progressCurrent: game.progressTotal } : {}),
    },
  });
  revalidateGames();
}

// « +1 » on the progress (sequence, chapter…), never past the total.
export async function stepProgress(gameId: string, delta: 1 | -1): Promise<void> {
  const user = await requireUser();
  const game = await ownedGame(user.id, gameId);
  const current = (game.progressCurrent ?? 0) + (delta === 1 ? 1 : -1);
  const bounded = Math.max(0, game.progressTotal ? Math.min(game.progressTotal, current) : current);
  await prisma.game.update({ where: { id: game.id }, data: { progressCurrent: bounded } });
  revalidateGames();
}

// « Ajouter du temps » after a session: « 1 h 30 », « 45 min ».
export async function addPlayTime(gameId: string, input: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const game = await ownedGame(user.id, gameId);
  const minutes = parsePlayTime(input);
  if (minutes === null || minutes <= 0 || minutes > 24 * 60) {
    return { error: 'Écris par exemple « 1 h 30 » ou « 45 min ».' };
  }
  await prisma.game.update({
    where: { id: game.id },
    data: { minutesPlayed: (game.minutesPlayed ?? 0) + minutes },
  });
  revalidateGames();
  return {};
}

export async function deleteGame(gameId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  await prisma.game.deleteMany({ where: { id: gameId, userId: user.id } });
  revalidateGames();
  return {};
}
