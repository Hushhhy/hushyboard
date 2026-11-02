'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { parseDateInput } from '@/lib/dates';
import { DEFAULT_CATEGORIES, parseEurosToCents } from '@/lib/finance';
import { fieldErrors, formValues, type FormState } from '@/lib/forms';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

// Finances. Money in integer cents (expense < 0), every transaction typed by hand.

function revalidateFinance() {
  revalidatePath('/finance', 'layout');
  revalidatePath('/');
}

async function ownedCategoryId(userId: string, categoryId: string | null) {
  if (!categoryId) return null;
  const category = await prisma.financeCategory.findFirst({ where: { id: categoryId, userId } });
  return category?.id ?? null;
}

export async function createDefaultCategories(): Promise<{ error?: string }> {
  const user = await requireUser();
  await prisma.financeCategory.createMany({
    data: DEFAULT_CATEGORIES.map((category, position) => ({
      userId: user.id,
      position,
      ...category,
    })),
    skipDuplicates: true,
  });
  revalidateFinance();
  return {};
}

const transactionSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['expense', 'income']),
  date: z.string().refine((value) => parseDateInput(value) !== null, 'Date invalide.'),
  label: z.string().trim().min(1, 'Indique un libellé.').max(200),
  amount: z.string().refine((value) => {
    const cents = parseEurosToCents(value);
    return cents !== null && cents > 0;
  }, 'Indique un montant positif, par exemple 12,50.'),
  categoryId: z.string().transform((value) => value || null),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((value) => value || null),
});

// « Ajouter une dépense » and the edit form.
export async function saveTransaction(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = transactionSchema.safeParse({ categoryId: '', notes: '', ...values });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { id, type, date, label, amount, categoryId, notes } = parsed.data;
  const cents = parseEurosToCents(amount)!;
  const data = {
    date: parseDateInput(date)!,
    label,
    amountCents: type === 'expense' ? -cents : cents,
    categoryId: await ownedCategoryId(user.id, categoryId),
    notes,
  };
  if (id) {
    const existing = await prisma.transaction.findFirst({ where: { id, userId: user.id } });
    if (!existing) return { error: 'Cette transaction n’existe plus.', values };
    await prisma.transaction.update({ where: { id: existing.id }, data });
  } else {
    await prisma.transaction.create({ data: { ...data, userId: user.id, source: 'MANUAL' } });
  }
  revalidateFinance();
  return { done: Date.now() };
}

// Quick classification from the list.
export async function setTransactionCategory(
  transactionId: string,
  categoryId: string
): Promise<void> {
  const user = await requireUser();
  const category = await ownedCategoryId(user.id, categoryId || null);
  await prisma.transaction.updateMany({
    where: { id: transactionId, userId: user.id },
    data: { categoryId: category },
  });
  revalidateFinance();
}

export async function deleteTransaction(transactionId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  await prisma.transaction.deleteMany({ where: { id: transactionId, userId: user.id } });
  revalidateFinance();
  return {};
}

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Nomme la catégorie.').max(40),
  kind: z.enum(['EXPENSE', 'INCOME', 'SAVINGS']),
});

export async function saveCategory(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData);
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const { id, ...data } = parsed.data;
  const clash = await prisma.financeCategory.findFirst({
    where: { userId: user.id, name: data.name, ...(id ? { NOT: { id } } : {}) },
  });
  if (clash) return { fieldErrors: { name: 'Cette catégorie existe déjà.' }, values };
  if (id) {
    await prisma.financeCategory.updateMany({ where: { id, userId: user.id }, data });
  } else {
    const last = await prisma.financeCategory.aggregate({
      where: { userId: user.id },
      _max: { position: true },
    });
    await prisma.financeCategory.create({
      data: { ...data, userId: user.id, position: (last._max.position ?? -1) + 1 },
    });
  }
  revalidateFinance();
  return { done: Date.now() };
}

// Archived categories leave the lists; their transactions keep them.
export async function setCategoryArchived(categoryId: string, archived: boolean): Promise<void> {
  const user = await requireUser();
  await prisma.financeCategory.updateMany({
    where: { id: categoryId, userId: user.id },
    data: { archivedAt: archived ? new Date() : null },
  });
  revalidateFinance();
}

// « Tout effacer »: deletes every transaction and the history of the old CSV imports, to start
// again from zero. Categories are kept.
export async function resetFinance(): Promise<{ error?: string }> {
  const user = await requireUser();
  await prisma.$transaction([
    prisma.transaction.deleteMany({ where: { userId: user.id } }),
    prisma.csvImport.deleteMany({ where: { userId: user.id } }),
  ]);
  revalidateFinance();
  return {};
}
