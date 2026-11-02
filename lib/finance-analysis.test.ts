import { describe, expect, it } from 'vitest';
import { analyzePeriod, niceCeil, periodMonths, type AnalysisLine } from './finance-analysis';

const food = { id: 'food', name: 'Alimentation', kind: 'EXPENSE' as const };
const rent = { id: 'rent', name: 'Logement', kind: 'EXPENSE' as const };
const pay = { id: 'pay', name: 'Revenus', kind: 'INCOME' as const };
const savings = { id: 'save', name: 'Épargne', kind: 'SAVINGS' as const };

const line = (day: string, amountCents: number, category: AnalysisLine['category']) => ({
  date: new Date(`${day}T00:00:00.000Z`),
  amountCents,
  category,
});

describe('analyzePeriod', () => {
  const lines = [
    line('2026-09-01', 200000, pay),
    line('2026-09-03', -80000, rent),
    line('2026-09-10', -20000, food),
    line('2026-09-28', -50000, savings),
    line('2026-10-01', 200000, pay),
    line('2026-10-03', -80000, rent),
    line('2026-10-12', -40000, food),
    line('2026-10-20', -1000, null),
    // Outside the period: ignored.
    line('2026-08-15', -99999, food),
  ];
  const result = analyzePeriod(lines, ['2026-09', '2026-10'], 10000);

  it('sums each month and carries the balance over', () => {
    expect(result.perMonth).toEqual([
      {
        month: '2026-09',
        income: 200000,
        expenses: 100000,
        savings: 50000,
        balance: 100000,
        closing: 110000,
      },
      {
        month: '2026-10',
        income: 200000,
        expenses: 121000,
        savings: 0,
        balance: 79000,
        closing: 189000,
      },
    ]);
  });

  it('gives totals, monthly averages and the savings rate', () => {
    expect(result.income).toBe(400000);
    expect(result.expenses).toBe(221000);
    expect(result.savings).toBe(50000);
    expect(result.balance).toBe(179000);
    expect(result.averageIncome).toBe(200000);
    expect(result.averageExpenses).toBe(110500);
    expect(result.savingsRate).toBe(44.8);
  });

  it('ranks the expense categories with their share and month by month amounts', () => {
    expect(result.byCategory).toEqual([
      { name: 'Logement', cents: 160000, share: 72.4, average: 80000, monthly: [80000, 80000] },
      { name: 'Alimentation', cents: 60000, share: 27.1, average: 30000, monthly: [20000, 40000] },
      { name: 'À classer', cents: 1000, share: 0.5, average: 500, monthly: [0, 1000] },
    ]);
  });

  it('handles an empty period', () => {
    const empty = analyzePeriod([], ['2026-10'], 0);
    expect(empty.savingsRate).toBeNull();
    expect(empty.byCategory).toEqual([]);
    expect(empty.perMonth[0].closing).toBe(0);
  });
});

describe('periodMonths', () => {
  it('lists the months ending with the last one, oldest first', () => {
    expect(periodMonths('2026-02', 4, '2020-01')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
  });

  it('starts no earlier than the first month with data', () => {
    expect(periodMonths('2026-11', 12, '2026-09')).toEqual(['2026-09', '2026-10', '2026-11']);
  });

  it('always keeps the last month', () => {
    expect(periodMonths('2026-11', 6, '2026-12')).toEqual(['2026-11']);
  });
});

describe('niceCeil', () => {
  it('rounds up to 1, 2 or 5 × a power of ten', () => {
    expect(niceCeil(374210)).toBe(500000);
    expect(niceCeil(150000)).toBe(200000);
    expect(niceCeil(100000)).toBe(100000);
    expect(niceCeil(7)).toBe(10);
    expect(niceCeil(0)).toBe(0);
  });
});
