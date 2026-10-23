'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Reward } from '@/components/rewards/rewards-provider';
import { parseDateInput, todayInParis } from '@/lib/dates';
import { fieldErrors, formValues, type FormState } from '@/lib/forms';
import { goalProgress, streak, streakDays, streakTrophies, toDayKey } from '@/lib/habits';
import { habitRule } from '@/lib/habits-data';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { TROPHIES } from '@/lib/trophies';

// Habits, check-ins, pauses and goals. No XP here: only streaks and trophies.

function revalidateHabits() {
  revalidatePath('/habits', 'layout');
  revalidatePath('/');
}

async function ownedHabit(userId: string, habitId: string) {
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId } });
  if (!habit) throw new Error('Habit not found');
  return habit;
}

const habitSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(1, 'Nomme l’habitude.').max(80),
    schedule: z.enum(['days', 'weekly']),
    activeDays: z.array(z.coerce.number().int().min(1).max(7)),
    timesPerWeek: z.coerce.number().int().min(1).max(7).optional(),
    unit: z
      .string()
      .trim()
      .max(20)
      .transform((value) => value || null),
  })
  .refine((data) => data.schedule === 'weekly' || data.activeDays.length > 0, {
    path: ['activeDays'],
    message: 'Choisis au moins un jour.',
  })
  .refine((data) => data.schedule === 'days' || data.timesPerWeek, {
    path: ['timesPerWeek'],
    message: 'Indique combien de fois par semaine.',
  });

// « Nouvelle habitude » and its edit form.
export async function saveHabit(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = habitSchema.safeParse({
    ...values,
    unit: values.unit ?? '',
    activeDays: formData.getAll('activeDays'),
    timesPerWeek: values.timesPerWeek || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { id, name, schedule, activeDays, timesPerWeek, unit } = parsed.data;
  const data = {
    name,
    unit,
    activeDays: schedule === 'days' ? [...new Set(activeDays)].sort() : [],
    timesPerWeek: schedule === 'weekly' ? (timesPerWeek ?? 1) : null,
  };
  if (id) {
    const habit = await ownedHabit(user.id, id);
    await prisma.habit.update({ where: { id: habit.id }, data });
  } else {
    const last = await prisma.habit.aggregate({
      where: { userId: user.id },
      _max: { position: true },
    });
    await prisma.habit.create({
      data: { ...data, userId: user.id, position: (last._max.position ?? -1) + 1 },
    });
  }
  revalidateHabits();
  return { done: Date.now() };
}

// « Archiver »: the habit leaves the day, its history stays (and can come back).
export async function setHabitArchived(habitId: string, archived: boolean): Promise<void> {
  const user = await requireUser();
  const habit = await ownedHabit(user.id, habitId);
  await prisma.habit.update({
    where: { id: habit.id },
    data: { archivedAt: archived ? new Date() : null },
  });
  revalidateHabits();
}

export async function deleteHabit(habitId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const habit = await ownedHabit(user.id, habitId);
  await prisma.habit.delete({ where: { id: habit.id } });
  revalidateHabits();
  return {};
}

// Today's check-in (optimistic on the client, undoable). A new streak milestone unlocks
// its trophy once.
export async function setCheckIn(habitId: string, done: boolean): Promise<{ rewards: Reward[] }> {
  const user = await requireUser();
  const habit = await ownedHabit(user.id, habitId);
  const today = todayInParis(new Date());
  if (!done) {
    await prisma.habitCheckIn.deleteMany({ where: { habitId: habit.id, date: today } });
    await refreshHabitGoals(user.id, habit.id);
    revalidateHabits();
    return { rewards: [] };
  }
  await prisma.habitCheckIn.createMany({
    data: [{ habitId: habit.id, date: today }],
    skipDuplicates: true,
  });

  const [checkIns, pauses] = await Promise.all([
    prisma.habitCheckIn.findMany({ where: { habitId: habit.id }, select: { date: true } }),
    prisma.habitPause.findMany({ where: { userId: user.id } }),
  ]);
  const days = streakDays(
    streak(
      habitRule(habit),
      new Set(checkIns.map((checkIn) => toDayKey(checkIn.date))),
      pauses,
      toDayKey(today)
    )
  );
  const keys = streakTrophies(days);
  const already = await prisma.trophyUnlock.findMany({
    where: { userId: user.id, trophyKey: { in: keys } },
    select: { trophyKey: true },
  });
  const fresh = keys.filter((key) => !already.some((item) => item.trophyKey === key));
  if (fresh.length > 0) {
    await prisma.trophyUnlock.createMany({
      // Announced right away by the client, with the habit name.
      data: fresh.map((trophyKey) => ({ userId: user.id, trophyKey, seenAt: new Date() })),
      skipDuplicates: true,
    });
  }
  await refreshHabitGoals(user.id, habit.id);
  revalidateHabits();
  return {
    rewards: fresh.map((key) => ({
      kind: 'trophy' as const,
      name: TROPHIES[key].name,
      domain: TROPHIES[key].domain,
      text: `« ${habit.name} » : ${days} jours de suite.`,
    })),
  };
}

// Optional quantity of today's check-in (45 min, 30 pages).
export async function setQuantity(habitId: string, quantity: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const habit = await ownedHabit(user.id, habitId);
  const value = quantity.trim() === '' ? null : Number(quantity.replace(',', '.'));
  if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100_000)) {
    return { error: 'Indique un nombre positif.' };
  }
  const today = todayInParis(new Date());
  await prisma.habitCheckIn.upsert({
    where: { habitId_date: { habitId: habit.id, date: today } },
    create: { habitId: habit.id, date: today, quantity: value === null ? null : Math.round(value) },
    update: { quantity: value === null ? null : Math.round(value) },
  });
  await refreshHabitGoals(user.id, habit.id);
  revalidateHabits();
  return {};
}

const pauseSchema = z
  .object({
    habitId: z.string().transform((value) => value || null),
    startDate: z.string().refine((value) => parseDateInput(value) !== null, 'Date invalide.'),
    endDate: z.string().refine((value) => parseDateInput(value) !== null, 'Date invalide.'),
    reason: z
      .string()
      .trim()
      .max(80)
      .transform((value) => value || null),
  })
  .refine((data) => data.endDate >= data.startDate, {
    path: ['endDate'],
    message: 'La fin doit suivre le début.',
  });

// « Planifier une pause »: the streaks are frozen during it.
export async function savePause(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = pauseSchema.safeParse({ habitId: '', reason: '', ...values });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { habitId, startDate, endDate, reason } = parsed.data;
  if (habitId) await ownedHabit(user.id, habitId);
  await prisma.habitPause.create({
    data: {
      userId: user.id,
      habitId,
      startDate: parseDateInput(startDate)!,
      endDate: parseDateInput(endDate)!,
      reason,
    },
  });
  revalidateHabits();
  return { done: Date.now() };
}

export async function deletePause(pauseId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  await prisma.habitPause.deleteMany({ where: { id: pauseId, userId: user.id } });
  revalidateHabits();
  return {};
}

// --- Goals -----------------------------------------------------------------------------

const goalSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().trim().min(1, 'Nomme l’objectif.').max(120),
    mode: z.enum(['target', 'steps']),
    target: z.coerce.number().int().min(1, 'Indique une cible.').max(1_000_000).optional(),
    unit: z.string().trim().max(20),
    habitId: z.string().transform((value) => value || null),
    deadline: z
      .string()
      .refine((value) => !value || parseDateInput(value) !== null, 'Date invalide.'),
    steps: z.string().max(4000),
  })
  .refine((data) => data.mode === 'steps' || data.target, {
    path: ['target'],
    message: 'Indique une cible.',
  })
  .refine((data) => data.mode === 'target' || data.steps.split('\n').some((line) => line.trim()), {
    path: ['steps'],
    message: 'Écris au moins une étape.',
  });

// Sets or clears achievedAt from the computed progress (the date of the event is kept).
async function refreshAchievement(goalId: string) {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    include: { steps: true, habit: { select: { unit: true } } },
  });
  if (!goal) return;
  let habitTotal: number | null = null;
  if (goal.habitId) {
    const where = {
      habitId: goal.habitId,
      date: {
        gte: new Date(`${toDayKey(goal.createdAt)}T00:00:00.000Z`),
        ...(goal.deadline ? { lte: goal.deadline } : {}),
      },
    };
    habitTotal = goal.habit?.unit
      ? ((await prisma.habitCheckIn.aggregate({ where, _sum: { quantity: true } }))._sum.quantity ??
        0)
      : await prisma.habitCheckIn.count({ where });
  }
  const { achieved } = goalProgress({ ...goal, habitTotal });
  if (achieved !== (goal.achievedAt !== null)) {
    await prisma.goal.update({
      where: { id: goal.id },
      data: { achievedAt: achieved ? new Date() : null },
    });
  }
}

export async function saveGoal(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = goalSchema.safeParse({
    unit: '',
    habitId: '',
    deadline: '',
    steps: '',
    ...values,
    target: values.target || undefined,
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { id, title, mode, target, unit, habitId, deadline, steps } = parsed.data;
  const habit = habitId
    ? await prisma.habit.findFirst({ where: { id: habitId, userId: user.id } })
    : null;
  const stepTitles =
    mode === 'steps'
      ? steps
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .slice(0, 30)
      : [];
  const data = {
    title,
    target: mode === 'target' ? (target ?? null) : null,
    // A goal fed by a habit counts in the habit's unit.
    unit: mode === 'target' ? (habit ? (habit.unit ?? 'fois') : unit || null) : null,
    habitId: mode === 'target' ? (habit?.id ?? null) : null,
    deadline: deadline ? parseDateInput(deadline) : null,
  };

  let goalId: string;
  if (id) {
    const goal = await prisma.goal.findFirst({
      where: { id, userId: user.id },
      include: { steps: true },
    });
    if (!goal) return { error: 'Cet objectif n’existe plus.', values };
    await prisma.$transaction(async (tx) => {
      await tx.goal.update({ where: { id: goal.id }, data });
      // Steps keep their « fait » when their title stays.
      const done = new Map(goal.steps.map((step) => [step.title, step.doneAt]));
      await tx.goalStep.deleteMany({ where: { goalId: goal.id } });
      if (stepTitles.length > 0) {
        await tx.goalStep.createMany({
          data: stepTitles.map((stepTitle, position) => ({
            goalId: goal.id,
            title: stepTitle,
            position,
            doneAt: done.get(stepTitle) ?? null,
          })),
        });
      }
    });
    goalId = goal.id;
  } else {
    const goal = await prisma.goal.create({
      data: {
        ...data,
        userId: user.id,
        steps: {
          create: stepTitles.map((stepTitle, position) => ({ title: stepTitle, position })),
        },
      },
    });
    goalId = goal.id;
  }
  await refreshAchievement(goalId);
  revalidateHabits();
  return { done: Date.now() };
}

export async function toggleGoalStep(stepId: string, done: boolean): Promise<void> {
  const user = await requireUser();
  const step = await prisma.goalStep.findFirst({
    where: { id: stepId, goal: { userId: user.id } },
  });
  if (!step) return;
  await prisma.goalStep.update({
    where: { id: step.id },
    data: { doneAt: done ? new Date() : null },
  });
  await refreshAchievement(step.goalId);
  revalidateHabits();
}

export async function setGoalProgress(goalId: string, value: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const goal = await prisma.goal.findFirst({ where: { id: goalId, userId: user.id } });
  if (!goal) return { error: 'Cet objectif n’existe plus.' };
  const number = Number(value.replace(',', '.'));
  if (!Number.isFinite(number) || number < 0 || number > 1_000_000) {
    return { error: 'Indique un nombre positif.' };
  }
  await prisma.goal.update({
    where: { id: goal.id },
    data: { manualProgress: Math.round(number) },
  });
  await refreshAchievement(goal.id);
  revalidateHabits();
  return {};
}

export async function deleteGoal(goalId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  await prisma.goal.deleteMany({ where: { id: goalId, userId: user.id } });
  revalidateHabits();
  return {};
}

// Goals linked to a habit follow its check-ins.
async function refreshHabitGoals(userId: string, habitId: string) {
  const goals = await prisma.goal.findMany({ where: { userId, habitId }, select: { id: true } });
  for (const goal of goals) await refreshAchievement(goal.id);
}
