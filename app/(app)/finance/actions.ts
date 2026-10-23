'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { parseDateInput } from '@/lib/dates';
import { DEFAULT_CATEGORIES, parseEurosToCents } from '@/lib/finance';
import { importKeys, labelKey } from '@/lib/finance-csv';
import { fieldErrors, formValues, type FormState } from '@/lib/forms';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

// Finances. Money in integer cents (expense < 0). The CSV file never reaches the server:
// the browser sends the parsed lines only.

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

// « Ajouter une dépense » and the edit form (manual entries; imported lines are editable too).
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

// --- CSV import ---------------------------------------------------------------------------

const lineSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  label: z.string().trim().min(1).max(200),
  amountCents: z
    .number()
    .int()
    .refine((value) => value !== 0 && Math.abs(value) < 1e10),
});
const linesSchema = z.array(lineSchema).min(1).max(5000);
type Line = z.infer<typeof lineSchema>;

// Server-side fingerprint (the client's own keys are not trusted).
function hashes(userId: string, lines: Line[]): string[] {
  return importKeys(lines).map((key) =>
    createHash('sha256').update(`${userId}|${key}`).digest('hex').slice(0, 40)
  );
}

export type LineStatus = 'new' | 'duplicate' | 'merged';

// A manual entry of the same day and amount: the imported line completes it instead of
// adding a second one (« Déjà saisie à la main, fusionnée »).
async function manualMatches(userId: string, lines: Line[]) {
  const days = [...new Set(lines.map((line) => line.date))].map((day) => parseDateInput(day)!);
  const manual = await prisma.transaction.findMany({
    where: { userId, source: 'MANUAL', importHash: null, date: { in: days } },
    select: { id: true, date: true, amountCents: true },
  });
  const used = new Set<string>();
  return lines.map((line) => {
    const match = manual.find(
      (item) =>
        !used.has(item.id) &&
        item.amountCents === line.amountCents &&
        item.date.toISOString().slice(0, 10) === line.date
    );
    if (match) used.add(match.id);
    return match?.id ?? null;
  });
}

// Step 2: what will happen to each line.
export async function previewImport(
  input: Line[]
): Promise<{ error?: string; statuses?: LineStatus[] }> {
  const user = await requireUser();
  const parsed = linesSchema.safeParse(input);
  if (!parsed.success) return { error: 'Lignes illisibles : recommence l’import.' };
  const lineHashes = hashes(user.id, parsed.data);
  const [existing, manual] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, importHash: { in: lineHashes } },
      select: { importHash: true },
    }),
    manualMatches(user.id, parsed.data),
  ]);
  const known = new Set(existing.map((item) => item.importHash));
  return {
    statuses: parsed.data.map((_, index) =>
      known.has(lineHashes[index]) ? 'duplicate' : manual[index] ? 'merged' : 'new'
    ),
  };
}

// Step 3: saves the new lines. Categories are guessed from past transactions with the same
// merchant; manual entries are completed; duplicates are skipped.
export async function importTransactions(
  fileName: string,
  input: Line[],
  totalRows: number
): Promise<{ error?: string; imported?: number; merged?: number; duplicates?: number }> {
  const user = await requireUser();
  const parsed = linesSchema.safeParse(input);
  const name = z.string().trim().min(1).max(200).safeParse(fileName);
  if (!parsed.success || !name.success)
    return { error: 'Lignes illisibles : recommence l’import.' };
  const lines = parsed.data;
  const lineHashes = hashes(user.id, lines);

  const [existing, manual, history] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, importHash: { in: lineHashes } },
      select: { importHash: true },
    }),
    manualMatches(user.id, lines),
    prisma.transaction.findMany({
      where: { userId: user.id, categoryId: { not: null } },
      orderBy: { date: 'desc' },
      take: 2000,
      select: { label: true, categoryId: true },
    }),
  ]);
  const known = new Set(existing.map((item) => item.importHash));
  const categoryByMerchant = new Map<string, string>();
  for (const item of history) {
    const key = labelKey(item.label);
    if (key && !categoryByMerchant.has(key)) categoryByMerchant.set(key, item.categoryId!);
  }

  let imported = 0;
  let merged = 0;
  let duplicates = 0;
  await prisma.$transaction(async (tx) => {
    const record = await tx.csvImport.create({
      data: {
        userId: user.id,
        fileName: name.data,
        rowCount: totalRows,
        importedCount: 0,
        skippedCount: 0,
      },
    });
    const fresh: {
      date: Date;
      label: string;
      amountCents: number;
      importHash: string;
      categoryId: string | null;
    }[] = [];
    for (const [index, line] of lines.entries()) {
      if (known.has(lineHashes[index])) {
        duplicates += 1;
        continue;
      }
      if (manual[index]) {
        await tx.transaction.update({
          where: { id: manual[index]! },
          data: { importHash: lineHashes[index], importId: record.id },
        });
        merged += 1;
        continue;
      }
      fresh.push({
        date: parseDateInput(line.date)!,
        label: line.label,
        amountCents: line.amountCents,
        importHash: lineHashes[index],
        categoryId: categoryByMerchant.get(labelKey(line.label)) ?? null,
      });
    }
    const created = await tx.transaction.createMany({
      data: fresh.map((line) => ({
        ...line,
        userId: user.id,
        source: 'CSV_IMPORT' as const,
        importId: record.id,
      })),
      skipDuplicates: true,
    });
    imported = created.count;
    duplicates += fresh.length - created.count;
    await tx.csvImport.update({
      where: { id: record.id },
      data: { importedCount: imported + merged, skippedCount: totalRows - imported - merged },
    });
  });
  revalidateFinance();
  return { imported, merged, duplicates };
}
