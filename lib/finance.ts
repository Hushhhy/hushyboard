import type { CategoryKind } from '@/generated/prisma/client';

// Default categories created for a new user (editable afterwards). Names are displayed, so in French.
export const DEFAULT_CATEGORIES: { name: string; kind: CategoryKind }[] = [
  { name: 'Logement', kind: 'EXPENSE' },
  { name: 'Alimentation', kind: 'EXPENSE' },
  { name: 'Transports', kind: 'EXPENSE' },
  { name: 'Abonnements', kind: 'EXPENSE' },
  { name: 'Loisirs', kind: 'EXPENSE' },
  { name: 'Santé', kind: 'EXPENSE' },
  { name: 'Divers', kind: 'EXPENSE' },
  { name: 'Revenus', kind: 'INCOME' },
  { name: 'Épargne', kind: 'SAVINGS' },
];

// Money is stored in cents to avoid float errors (0.1 + 0.2 !== 0.3 in JavaScript).
const euroFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

// 123456 → "1 234,56 €"
export function formatEuros(amountCents: number): string {
  return euroFormatter.format(amountCents / 100);
}

// "49,99", "49.99", "1 234,5 €" → 4999, 4999, 123450. Null when it is not an amount.
// Parsed as text (never through floats) so the cents are exact.
export function parseEurosToCents(input: string): number | null {
  const cleaned = input.replace(/[\s  €]/g, '').replace(',', '.');
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const [, sign, units, decimals = ''] = match;
  const cents = Number(units) * 100 + Number(decimals.padEnd(2, '0'));
  return sign ? -cents : cents;
}

// --- Month summary (computed, never stored) --------------------------------------------

export type SummaryLine = {
  amountCents: number;
  category: { id: string; name: string; kind: CategoryKind } | null;
};

export const UNCATEGORIZED = 'À classer';

// Income and expenses of a month. A transfer to savings is neither: it is shown apart
// (« Épargne ») and does not lower the balance. Money moved back from savings is not income.
export function monthSummary(lines: SummaryLine[]) {
  let income = 0;
  let expenses = 0;
  let savings = 0;
  const byCategory = new Map<string, { name: string; cents: number }>();
  for (const line of lines) {
    if (line.category?.kind === 'SAVINGS') {
      savings -= line.amountCents;
      continue;
    }
    if (line.amountCents > 0) income += line.amountCents;
    else {
      expenses -= line.amountCents;
      const name = line.category?.name ?? UNCATEGORIZED;
      const entry = byCategory.get(name) ?? { name, cents: 0 };
      entry.cents -= line.amountCents;
      byCategory.set(name, entry);
    }
  }
  return {
    income,
    expenses,
    savings,
    balance: income - expenses,
    // Share of income spent, null without income.
    spentShare: income > 0 ? Math.round((expenses / income) * 1000) / 10 : null,
    byCategory: [...byCategory.values()].sort((a, b) => b.cents - a.cents),
    uncategorized: lines.filter((line) => !line.category).length,
  };
}

// "+412,30 €" / "−87,10 €": signed amount for balances.
export function formatSignedEuros(amountCents: number): string {
  const text = formatEuros(Math.abs(amountCents));
  if (amountCents === 0) return text;
  return `${amountCents > 0 ? '+' : '−'}${text}`;
}
