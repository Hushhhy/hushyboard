import Link from 'next/link';
import { PageHeader } from '@/components/app-shell/page-header';
import { FinanceIcon } from '@/components/icons';
import { BarChart } from '@/components/ui/bar-row';
import { EmptyState } from '@/components/ui/empty-state';
import { ModuleCard } from '@/components/ui/module-card';
import { formatShortDate, monthKeyRange } from '@/lib/dates';
import { formatEuros, formatSignedEuros, UNCATEGORIZED } from '@/lib/finance';
import { analyzePeriod, periodMonths } from '@/lib/finance-analysis';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import { BalanceTrend, CategoryHeatmap, IncomeExpenseColumns } from './finance-charts';
import { FinanceTabs, Kpi, monthBounds, param, type SearchParams } from './finance-views';

const RANGES = [3, 6, 12] as const;
const DEFAULT_RANGE = 6;

const formatPercent = (value: number) => `${value.toString().replace('.', ',')} %`;

// « Analyse »: the last 3, 6 or 12 months at a glance (?range=), never before the first
// month with data.
export async function AnalysisView({ searchParams }: { searchParams: SearchParams }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const requested = Number(param(params, 'range'));
  const range = RANGES.find((item) => item === requested) ?? DEFAULT_RANGE;
  const { min, current } = await monthBounds(user.id, undefined);
  const months = periodMonths(current, range, min);
  const start = monthKeyRange(months[0]).start;
  const { end } = monthKeyRange(current);
  const notSavings = {
    OR: [{ categoryId: null }, { category: { kind: { not: 'SAVINGS' as const } } }],
  };

  const [lines, before, biggest] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: start, lt: end } },
      select: {
        date: true,
        amountCents: true,
        category: { select: { id: true, name: true, kind: true } },
      },
    }),
    // Balance carried over from the months before the period (same rule as monthSummary).
    prisma.transaction.aggregate({
      where: { userId: user.id, date: { lt: start }, ...notSavings },
      _sum: { amountCents: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId: user.id,
        date: { gte: start, lt: end },
        amountCents: { lt: 0 },
        ...notSavings,
      },
      orderBy: [{ amountCents: 'asc' }, { date: 'desc' }],
      take: 5,
      select: {
        id: true,
        date: true,
        label: true,
        amountCents: true,
        category: { select: { name: true } },
      },
    }),
  ]);

  const analysis = analyzePeriod(lines, months, before._sum.amountCents ?? 0);
  const count = months.length;
  const period = count === 1 ? 'ce mois-ci' : `sur ${count} mois`;
  const closing = analysis.perMonth[count - 1].closing;
  const top = analysis.byCategory[0];
  const title =
    lines.length === 0
      ? 'Rien à analyser pour l’instant.'
      : analysis.savingsRate === null
        ? `${formatEuros(analysis.expenses)} de dépenses ${period}.`
        : analysis.savingsRate >= 0
          ? `Tu gardes ${formatPercent(analysis.savingsRate)} de tes revenus ${period}.`
          : `Tu dépenses plus que tes revenus ${period} (${formatPercent(-analysis.savingsRate)} de trop).`;

  return (
    <>
      <PageHeader breadcrumb="Finances" title={title} />
      <FinanceTabs />
      <nav aria-label="Période analysée">
        <ul className="flex flex-wrap gap-2">
          {RANGES.map((item) => {
            const active = item === range;
            return (
              <li key={item}>
                <Link
                  href={
                    item === DEFAULT_RANGE ? '/finance/analysis' : `/finance/analysis?range=${item}`
                  }
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex h-8 items-center rounded-control border px-2.5 text-body-14 whitespace-nowrap transition-colors duration-(--duration-tick) ${
                    active
                      ? 'border-line-strong bg-surface-raised font-semibold text-fg-1'
                      : 'border-transparent bg-surface-default font-medium text-fg-2 hover:bg-surface-raised hover:text-fg-1'
                  }`}
                >
                  {item} derniers mois
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {lines.length === 0 ? (
        <EmptyState
          variant="block"
          icon={<FinanceIcon className="size-7 text-finance" />}
          title="Aucune transaction sur cette période."
          description="Saisis tes revenus et tes dépenses : les graphiques se construisent au fil des mois."
          action={{ label: 'Ajouter une dépense', href: '/finance?panel=transaction-new' }}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Revenus par mois"
              value={formatEuros(analysis.averageIncome)}
              hint={`${formatEuros(analysis.income)} en tout`}
            />
            <Kpi
              label="Dépenses par mois"
              value={formatEuros(analysis.averageExpenses)}
              hint={`${formatEuros(analysis.expenses)} en tout`}
            />
            <Kpi
              label="Taux d’épargne"
              value={analysis.savingsRate === null ? '—' : formatPercent(analysis.savingsRate)}
              hint="part des revenus non dépensée"
              accent
            />
            <Kpi
              label="Solde actuel"
              value={formatSignedEuros(closing)}
              hint={`dont ${formatSignedEuros(analysis.balance)} ${period}`}
            />
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <ModuleCard
              title="Revenus et dépenses"
              icon={<FinanceIcon className="size-4" />}
              accentClass="text-finance"
            >
              <IncomeExpenseColumns months={analysis.perMonth} />
            </ModuleCard>
            <ModuleCard title="Solde fin de mois">
              <BalanceTrend
                points={analysis.perMonth.map((month) => ({
                  month: month.month,
                  balance: month.closing,
                }))}
                caption={`Solde à la fin de chaque mois, ${period}`}
              />
              <p className="text-caption-12 text-fg-3">
                Les virements vers l’épargne restent comptés dans le solde.
              </p>
            </ModuleCard>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            <ModuleCard
              title="Où part l’argent"
              aside={top ? `${top.name} : ${formatPercent(top.share)}` : undefined}
            >
              {analysis.byCategory.length === 0 ? (
                <p className="text-body-14 text-fg-2">Aucune dépense {period}.</p>
              ) : (
                <BarChart
                  caption={`Dépenses par catégorie ${period}`}
                  valueHeader="Montant"
                  rows={analysis.byCategory.map((category) => ({
                    key: category.name,
                    label: category.name,
                    value: category.cents,
                    colorClass: category.name === UNCATEGORIZED ? 'bg-warning' : 'bg-finance',
                    display: `${formatEuros(category.cents)} · ${formatPercent(category.share)}`,
                  }))}
                />
              )}
            </ModuleCard>
            <ModuleCard title="Plus grosses dépenses">
              {biggest.length === 0 ? (
                <p className="text-body-14 text-fg-2">Aucune dépense {period}.</p>
              ) : (
                <ol className="flex flex-col">
                  {biggest.map((line) => (
                    <li
                      key={line.id}
                      className="flex items-baseline gap-3 border-t border-line-subtle py-2 first:border-t-0"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold" title={line.label}>
                          {line.label}
                        </span>
                        <span className="text-caption-12 text-fg-2">
                          {formatShortDate(line.date)} · {line.category?.name ?? UNCATEGORIZED}
                        </span>
                      </span>
                      <span className="font-semibold whitespace-nowrap tabular">
                        {formatEuros(-line.amountCents)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </ModuleCard>
          </div>

          {analysis.byCategory.length > 0 && count > 1 ? (
            <ModuleCard title="Catégories mois par mois">
              <CategoryHeatmap months={months} categories={analysis.byCategory} />
              <p className="text-caption-12 text-fg-3">
                Plus la case est teintée, plus la dépense du mois est forte.
              </p>
            </ModuleCard>
          ) : null}
        </>
      )}
    </>
  );
}
