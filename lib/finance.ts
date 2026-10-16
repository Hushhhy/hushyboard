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
