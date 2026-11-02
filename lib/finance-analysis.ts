import { monthSummary, runningBalances, type SummaryLine } from './finance';

// « Analyse » tab: figures of a period of months, computed from the transactions (never stored).

export type AnalysisLine = SummaryLine & { date: Date };

export type MonthFigures = {
  month: string; // "2026-11"
  income: number;
  expenses: number;
  savings: number;
  // Income − expenses of the month (transfers to savings are kept, so they count as saved).
  balance: number;
  // Month-end balance carried over from the months before.
  closing: number;
};

export type CategoryFigures = {
  name: string;
  cents: number;
  // Share of the period's expenses, in percent with one decimal.
  share: number;
  // Average per month of the period.
  average: number;
  // Expenses of each month of the period, in the order of `months`.
  monthly: number[];
};

// Month key of a stored day ("@db.Date" comes back as UTC midnight).
const monthOf = (date: Date) => date.toISOString().slice(0, 7);

const percent = (part: number, whole: number) => Math.round((part / whole) * 1000) / 10;

// `months`: the month keys of the period, oldest first. `opening`: the balance carried over
// from every month before the period. Lines outside the period are ignored.
export function analyzePeriod(lines: AnalysisLine[], months: string[], opening: number) {
  const byMonth = new Map(months.map((month) => [month, [] as AnalysisLine[]]));
  for (const line of lines) byMonth.get(monthOf(line.date))?.push(line);

  const summaries = months.map((month) => monthSummary(byMonth.get(month)!));
  const closings = runningBalances(
    opening,
    summaries.map((summary) => summary.balance)
  );
  const perMonth: MonthFigures[] = months.map((month, index) => ({
    month,
    income: summaries[index].income,
    expenses: summaries[index].expenses,
    savings: summaries[index].savings,
    balance: summaries[index].balance,
    closing: closings[index],
  }));

  const total = (key: 'income' | 'expenses' | 'savings' | 'balance') =>
    perMonth.reduce((sum, month) => sum + month[key], 0);
  const income = total('income');
  const expenses = total('expenses');
  const count = Math.max(1, months.length);

  const categories = new Map<string, number[]>();
  summaries.forEach((summary, index) => {
    for (const category of summary.byCategory) {
      const monthly = categories.get(category.name) ?? months.map(() => 0);
      monthly[index] += category.cents;
      categories.set(category.name, monthly);
    }
  });
  const byCategory: CategoryFigures[] = [...categories.entries()]
    .map(([name, monthly]) => {
      const cents = monthly.reduce((sum, value) => sum + value, 0);
      return {
        name,
        cents,
        share: expenses > 0 ? percent(cents, expenses) : 0,
        average: Math.round(cents / count),
        monthly,
      };
    })
    .sort((a, b) => b.cents - a.cents || a.name.localeCompare(b.name));

  return {
    perMonth,
    income,
    expenses,
    savings: total('savings'),
    balance: total('balance'),
    averageIncome: Math.round(income / count),
    averageExpenses: Math.round(expenses / count),
    // Share of income not spent, null without income.
    savingsRate: income > 0 ? percent(income - expenses, income) : null,
    byCategory,
  };
}

// The month keys of a period of `length` months ending with `last`, never before `first`
// (the first month with data): an account started 2 months ago shows 2 months, not 12 empty ones.
export function periodMonths(last: string, length: number, first: string): string[] {
  const months: string[] = [];
  let [year, month] = last.split('-').map(Number);
  for (let index = 0; index < length; index++) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    if (key < first) break;
    months.unshift(key);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return months.length > 0 ? months : [last];
}

// A round top for a chart axis: 1, 2 or 5 × a power of ten, at least `value`.
// 3 742,10 € → 5 000 € (in cents: 374210 → 500000). 0 → 0.
export function niceCeil(value: number): number {
  if (value <= 0) return 0;
  const power = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((factor) => factor * power >= value)!;
  return step * power;
}
