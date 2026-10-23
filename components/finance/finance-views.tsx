import Link from 'next/link';
import {
  createDefaultCategories,
  deleteTransaction,
  setCategoryArchived,
} from '@/app/(app)/finance/actions';
import { PageHeader } from '@/components/app-shell/page-header';
import { FinanceIcon, PencilIcon, PlusIcon, SearchIcon, UploadIcon } from '@/components/icons';
import { ActionButton } from '@/components/skills/action-button';
import { BarChart } from '@/components/ui/bar-row';
import { buttonClasses } from '@/components/ui/button';
import { DeleteDialog } from '@/components/ui/delete-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { ModuleCard } from '@/components/ui/module-card';
import { MonthPicker } from '@/components/ui/month-picker';
import { SidePanel } from '@/components/ui/side-panel';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import {
  formatMonthKey,
  formatMonthKeyName,
  formatShortDate,
  isMonthKey,
  monthKeyInParis,
  monthKeyRange,
  shiftMonthKey,
  toDateInputValue,
} from '@/lib/dates';
import { formatEuros, formatSignedEuros, monthSummary } from '@/lib/finance';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';
import {
  CategoryCell,
  CategoryForm,
  ImportWizard,
  TransactionForm,
  type CategoryOption,
} from './finance-client';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const param = (params: Record<string, string | string[] | undefined>, key: string) =>
  typeof params[key] === 'string' ? (params[key] as string) : undefined;

const KIND_LABELS = { EXPENSE: 'Dépenses', INCOME: 'Revenus', SAVINGS: 'Épargne' } as const;

function FinanceTabs() {
  return (
    <Tabs
      label="Sections des finances"
      items={[
        { href: '/finance', label: 'Mois' },
        { href: '/finance/transactions', label: 'Transactions' },
        { href: '/finance/import', label: 'Import' },
      ]}
    />
  );
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

async function getCategories(userId: string) {
  const categories = await prisma.financeCategory.findMany({
    where: { userId },
    orderBy: [{ position: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, kind: true, archivedAt: true },
  });
  return {
    active: categories.filter((category) => !category.archivedAt) as CategoryOption[],
    archived: categories.filter((category) => category.archivedAt),
  };
}

// The displayed month (?month=), bounded by the first month with data and the current one.
async function monthBounds(userId: string, requested: string | undefined) {
  const current = monthKeyInParis(new Date());
  const first = await prisma.transaction.findFirst({
    where: { userId },
    orderBy: { date: 'asc' },
    select: { date: true },
  });
  const min = first ? first.date.toISOString().slice(0, 7) : current;
  const month = requested && isMonthKey(requested) && requested <= current ? requested : current;
  return { month: month < min ? min : month, min, current };
}

// Panels shared by the month and transactions pages.
function TransactionPanels({
  categories,
  editing,
  closeHref,
}: {
  categories: CategoryOption[];
  editing: {
    id: string;
    date: Date;
    label: string;
    amountCents: number;
    categoryId: string | null;
    notes: string | null;
    source: 'MANUAL' | 'CSV_IMPORT';
  } | null;
  closeHref: string;
}) {
  return (
    <>
      <SidePanel name="transaction-new" title="Ajouter une dépense ou un revenu">
        <TransactionForm transaction={null} categories={categories} closeHref={closeHref} />
      </SidePanel>
      {editing ? (
        <SidePanel
          name={`transaction-${editing.id}`}
          title="Modifier la transaction"
          subtitle={
            editing.source === 'CSV_IMPORT' ? 'Importée depuis un relevé CSV' : 'Saisie à la main'
          }
        >
          <TransactionForm transaction={editing} categories={categories} closeHref={closeHref} />
          <div className="mt-auto flex justify-end border-t border-line-subtle pt-3">
            <DeleteDialog
              title={`Supprimer « ${editing.label} » ?`}
              description={
                editing.source === 'CSV_IMPORT'
                  ? 'La transaction sera supprimée. Si tu réimportes le même relevé, elle sera de nouveau ajoutée.'
                  : 'La transaction sera supprimée définitivement.'
              }
              onConfirm={deleteTransaction.bind(null, editing.id)}
            />
          </div>
        </SidePanel>
      ) : null}
    </>
  );
}

function NoCategories() {
  return (
    <EmptyState
      variant="block"
      icon={<FinanceIcon className="size-7 text-finance" />}
      title="Aucune catégorie pour l’instant."
      description="Commence avec la liste par défaut (Logement, Alimentation, Transports, Abonnements, Loisirs, Santé, Divers, Revenus, Épargne) : tu pourras la modifier ensuite."
    >
      <ActionButton action={createDefaultCategories}>Créer les catégories par défaut</ActionButton>
    </EmptyState>
  );
}

// --- Month -------------------------------------------------------------------------------

// Month-end balance of the last 6 months, as a line (finance color) with a table for
// screen readers.
function BalanceTrend({ points }: { points: { month: string; balance: number }[] }) {
  const width = 320;
  const height = 120;
  const pad = 8;
  const values = points.map((point) => point.balance);
  const top = Math.max(0, ...values);
  const bottom = Math.min(0, ...values);
  const span = top - bottom || 1;
  const x = (index: number) => pad + (index * (width - 2 * pad)) / Math.max(1, points.length - 1);
  const y = (value: number) => pad + ((top - value) * (height - 2 * pad)) / span;
  const path = points
    .map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.balance)}`)
    .join(' ');
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="sr-only">Solde de chaque mois, sur les 6 derniers mois</figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        className="h-32 w-full overflow-visible"
      >
        <line
          x1={pad}
          x2={width - pad}
          y1={y(0)}
          y2={y(0)}
          className="stroke-line-strong"
          strokeDasharray="3 3"
        />
        <path
          d={path}
          fill="none"
          className="stroke-finance"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {points.map((point, index) => (
          <circle
            key={point.month}
            cx={x(index)}
            cy={y(point.balance)}
            r={index === points.length - 1 ? 4 : 2.5}
            className="fill-finance"
          />
        ))}
      </svg>
      <div aria-hidden="true" className="flex justify-between text-caption-12 text-fg-3">
        {points.map((point) => (
          <span key={point.month}>{formatMonthKeyName(point.month).slice(0, 4)}.</span>
        ))}
      </div>
      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">Mois</th>
            <th scope="col">Solde</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.month}>
              <th scope="row">{formatMonthKey(point.month)}</th>
              <td>{formatSignedEuros(point.balance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-card bg-surface-default px-4.5 py-4">
      <p className="text-label-12 text-fg-3 uppercase">{label}</p>
      <p className={`text-kpi-30 tabular ${accent ? 'text-finance' : ''}`}>{value}</p>
      {hint ? <p className="text-caption-12 text-fg-2">{hint}</p> : null}
    </div>
  );
}

export async function MonthView({ searchParams }: { searchParams: SearchParams }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const [{ month, min, current }, categories] = await Promise.all([
    monthBounds(user.id, param(params, 'month')),
    getCategories(user.id),
  ]);
  const trendStart = shiftMonthKey(month, -5);
  const { end } = monthKeyRange(month);
  const lines = await prisma.transaction.findMany({
    where: { userId: user.id, date: { gte: monthKeyRange(trendStart).start, lt: end } },
    select: {
      date: true,
      amountCents: true,
      category: { select: { id: true, name: true, kind: true } },
    },
  });
  const byMonth = (key: string) => lines.filter((line) => line.date.toISOString().startsWith(key));
  const summary = monthSummary(byMonth(month));
  const trend = Array.from({ length: 6 }, (_, index) => {
    const key = shiftMonthKey(trendStart, index);
    return { month: key, balance: monthSummary(byMonth(key)).balance };
  });

  const panel = param(params, 'panel');
  const editing =
    panel?.startsWith('transaction-') && panel !== 'transaction-new'
      ? await prisma.transaction.findFirst({ where: { id: panel.slice(12), userId: user.id } })
      : null;
  const pageHref = month === current ? '/finance' : `/finance?month=${month}`;
  const panelHref = `/finance?${month === current ? '' : `month=${month}&`}panel=transaction-new`;
  const isEmpty = byMonth(month).length === 0;
  const dayNote =
    month === current ? ` au ${Number(toDateInputValue(new Date()).slice(8))}` : ' en fin de mois';
  const title = isEmpty
    ? `${capitalize(formatMonthKeyName(month))} : aucune transaction.`
    : `${capitalize(formatMonthKeyName(month))} : ${formatSignedEuros(summary.balance)} de solde${dayNote}.`;

  return (
    <>
      <PageHeader breadcrumb="Finances" title={title} />
      <FinanceTabs />
      <div className="flex flex-wrap items-center gap-2">
        <MonthPicker month={month} min={min} max={current} basePath="/finance" />
        <span className="flex-1" />
        <Link href="/finance/import" className={buttonClasses()}>
          <UploadIcon className="size-4" />
          Importer un CSV
        </Link>
        <Link href={panelHref} scroll={false} className={buttonClasses({ variant: 'primary' })}>
          <PlusIcon className="size-4" />
          Ajouter une dépense
        </Link>
      </div>

      {categories.active.length === 0 && categories.archived.length === 0 ? <NoCategories /> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Revenus" value={formatEuros(summary.income)} />
        <Kpi
          label="Dépenses"
          value={formatEuros(summary.expenses)}
          hint={
            summary.spentShare === null
              ? undefined
              : `${summary.spentShare.toString().replace('.', ',')} % des revenus`
          }
        />
        <Kpi
          label="Solde"
          value={formatSignedEuros(summary.balance)}
          hint="revenus − dépenses"
          accent
        />
        <Kpi
          label="Épargne"
          value={formatSignedEuros(summary.savings)}
          hint="virements vers l’épargne"
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ModuleCard
          title="Dépenses par catégorie"
          icon={<FinanceIcon className="size-4" />}
          accentClass="text-finance"
        >
          {summary.byCategory.length === 0 ? (
            <EmptyState
              title={`Aucune dépense en ${formatMonthKeyName(month)}.`}
              description="Importe le relevé de ta banque ou ajoute une dépense à la main."
              action={{ label: 'Importer un CSV', href: '/finance/import' }}
            />
          ) : (
            <>
              <BarChart
                caption={`Dépenses de ${formatMonthKey(month)} par catégorie`}
                valueHeader="Montant"
                rows={summary.byCategory.map((category) => ({
                  key: category.name,
                  label: category.name,
                  value: category.cents,
                  colorClass: category.name === 'À classer' ? 'bg-warning' : 'bg-finance',
                  display: formatEuros(category.cents),
                }))}
              />
              {summary.uncategorized > 0 ? (
                <Link
                  href={`/finance/transactions?month=${month}&filter=uncategorized`}
                  className="self-start text-body-14 text-fg-2 underline hover:text-fg-1"
                >
                  {summary.uncategorized} transaction{summary.uncategorized > 1 ? 's' : ''} à
                  classer
                </Link>
              ) : null}
            </>
          )}
        </ModuleCard>
        <ModuleCard title="Solde fin de mois · 6 derniers mois">
          <BalanceTrend points={trend} />
        </ModuleCard>
      </div>

      <TransactionPanels categories={categories.active} editing={editing} closeHref={pageHref} />
    </>
  );
}

// --- Transactions -------------------------------------------------------------------------

const FILTERS = [
  { key: 'all', label: 'Toutes' },
  { key: 'expense', label: 'Dépenses' },
  { key: 'income', label: 'Revenus' },
  { key: 'uncategorized', label: 'Sans catégorie' },
] as const;
type FilterKey = (typeof FILTERS)[number]['key'];
const PAGE_SIZE = 50;

export async function TransactionsView({ searchParams }: { searchParams: SearchParams }) {
  const [user, params] = await Promise.all([requireUser(), searchParams]);
  const [{ month, min, current }, categories] = await Promise.all([
    monthBounds(user.id, param(params, 'month')),
    getCategories(user.id),
  ]);
  const filter = (FILTERS.find((item) => item.key === param(params, 'filter'))?.key ??
    'all') as FilterKey;
  const query = (param(params, 'q') ?? '').trim().slice(0, 100);
  const limit = Math.min(1000, Math.max(PAGE_SIZE, Number(param(params, 'limit')) || PAGE_SIZE));
  const { start, end } = monthKeyRange(month);

  const all = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      date: { gte: start, lt: end },
      ...(query ? { label: { contains: query, mode: 'insensitive' as const } } : {}),
    },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: { category: { select: { id: true, name: true, kind: true } } },
  });
  const matches = (key: FilterKey, line: (typeof all)[number]) =>
    key === 'all' ||
    (key === 'expense' && line.amountCents < 0) ||
    (key === 'income' && line.amountCents > 0) ||
    (key === 'uncategorized' && !line.categoryId);
  const counts = Object.fromEntries(
    FILTERS.map((item) => [item.key, all.filter((line) => matches(item.key, line)).length])
  ) as Record<FilterKey, number>;
  const shown = all.filter((line) => matches(filter, line));
  const page = shown.slice(0, limit);

  const href = (changes: Record<string, string | null>) => {
    const search = new URLSearchParams();
    const merged = {
      month: month === current ? null : month,
      filter: filter === 'all' ? null : filter,
      q: query || null,
      ...changes,
    };
    for (const [key, value] of Object.entries(merged)) if (value) search.set(key, value);
    const text = search.toString();
    return `/finance/transactions${text ? `?${text}` : ''}`;
  };
  const pageHref = href({});
  const panel = param(params, 'panel');
  const editing =
    panel?.startsWith('transaction-') && panel !== 'transaction-new'
      ? (all.find((line) => line.id === panel.slice(12)) ??
        (await prisma.transaction.findFirst({ where: { id: panel.slice(12), userId: user.id } })))
      : null;
  const editingCategory =
    panel?.startsWith('category-') && panel !== 'category-new'
      ? categories.active.find((category) => category.id === panel.slice(9))
      : undefined;
  const monthName = formatMonthKeyName(month);
  const title =
    counts.all === 0
      ? `Aucune transaction en ${monthName}${query ? ' pour cette recherche' : ''}.`
      : `${counts.all} transaction${counts.all > 1 ? 's' : ''} en ${monthName}, ${
          counts.uncategorized === 0 ? 'toutes classées' : `${counts.uncategorized} sans catégorie`
        }.`;
  const withPanel = (name: string) =>
    `${pageHref}${pageHref.includes('?') ? '&' : '?'}panel=${name}`;

  return (
    <>
      <PageHeader breadcrumb="Finances" title={title} />
      <FinanceTabs />
      <div className="flex flex-wrap items-center gap-2">
        <MonthPicker month={month} min={min} max={current} basePath="/finance/transactions" />
        <form action="/finance/transactions" className="flex min-w-60 flex-1 items-center gap-2">
          {month !== current ? <input type="hidden" name="month" value={month} /> : null}
          {filter !== 'all' ? <input type="hidden" name="filter" value={filter} /> : null}
          <label className="relative flex flex-1 items-center">
            <span className="sr-only">Chercher un libellé</span>
            <SearchIcon className="pointer-events-none absolute left-2.5 size-4 text-fg-3" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Chercher un libellé…"
              className="h-9 w-full rounded-control border border-line-strong bg-surface-sunken pr-2 pl-8 text-body-14"
            />
          </label>
        </form>
        <Link
          href={withPanel('categories')}
          scroll={false}
          className={buttonClasses({ variant: 'quiet' })}
        >
          Catégories
        </Link>
        <Link
          href={withPanel('transaction-new')}
          scroll={false}
          className={buttonClasses({ variant: 'primary' })}
        >
          <PlusIcon className="size-4" />
          Ajouter une dépense
        </Link>
      </div>

      <nav aria-label="Filtrer les transactions">
        <ul className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const active = item.key === filter;
            return (
              <li key={item.key}>
                <Link
                  href={href({ filter: item.key === 'all' ? null : item.key })}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-body-14 whitespace-nowrap transition-colors duration-(--duration-tick) ${
                    active
                      ? 'border-line-strong bg-surface-raised font-semibold text-fg-1'
                      : 'border-transparent bg-surface-default font-medium text-fg-2 hover:bg-surface-raised hover:text-fg-1'
                  }`}
                >
                  {item.label}
                  <span className="text-caption-12 text-fg-3 tabular">{counts[item.key]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {categories.active.length === 0 && categories.archived.length === 0 ? <NoCategories /> : null}

      <section
        aria-label="Transactions"
        className="flex flex-col gap-2 rounded-card bg-surface-default p-4"
      >
        {shown.length === 0 ? (
          <EmptyState
            title={
              counts.all === 0
                ? query
                  ? `Aucun libellé ne contient « ${query} ».`
                  : `Aucune transaction en ${monthName}.`
                : 'Aucune transaction pour ce filtre.'
            }
            description={
              counts.all === 0 && !query
                ? 'Importe le relevé de ta banque ou ajoute une dépense à la main.'
                : undefined
            }
            action={
              counts.all === 0 && !query
                ? { label: 'Importer un CSV', href: '/finance/import' }
                : { label: 'Effacer les filtres', href: href({ filter: null, q: null }) }
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-160 text-body-14">
                <caption className="sr-only">{title}</caption>
                <thead>
                  <tr className="text-left text-caption-12 text-fg-3">
                    <th scope="col" className="py-2 font-medium">
                      Date
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Libellé
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Catégorie
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Source
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Montant
                    </th>
                    <th scope="col" className="py-2">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {page.map((line) => (
                    <tr key={line.id} className="border-t border-line-subtle">
                      <td className="py-2 whitespace-nowrap text-fg-2 tabular">
                        {formatShortDate(line.date).replace(/ \d{4}$/, '')}
                      </td>
                      <td className="max-w-80 truncate py-2" title={line.label}>
                        {line.label}
                      </td>
                      <td className="py-1.5">
                        <CategoryCell
                          transactionId={line.id}
                          categoryId={line.categoryId}
                          categories={
                            line.category &&
                            !categories.active.some((item) => item.id === line.category!.id)
                              ? [...categories.active, line.category]
                              : categories.active
                          }
                          label={line.label}
                        />
                      </td>
                      <td className="py-2 text-caption-12 text-fg-3">
                        {line.source === 'CSV_IMPORT' ? 'Import CSV' : 'Saisie'}
                      </td>
                      <td
                        className={`py-2 text-right font-semibold whitespace-nowrap tabular ${
                          line.amountCents > 0 ? 'text-finance' : ''
                        }`}
                      >
                        {formatSignedEuros(line.amountCents)}
                      </td>
                      <td className="py-1.5 pl-2 text-right">
                        <Link
                          href={withPanel(`transaction-${line.id}`)}
                          scroll={false}
                          aria-label={`Modifier « ${line.label} »`}
                          className={buttonClasses({ variant: 'icon' })}
                        >
                          <PencilIcon className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-3 border-t border-line-subtle pt-3">
              <p className="flex-1 text-caption-12 text-fg-3">
                {page.length} sur {shown.length} · plus récentes d’abord
              </p>
              {page.length < shown.length ? (
                <Link
                  href={`${pageHref}${pageHref.includes('?') ? '&' : '?'}limit=${limit + PAGE_SIZE}`}
                  scroll={false}
                  className={buttonClasses()}
                >
                  Voir les suivantes
                </Link>
              ) : null}
            </div>
          </>
        )}
      </section>

      <TransactionPanels categories={categories.active} editing={editing} closeHref={pageHref} />

      <SidePanel
        name="categories"
        title="Catégories"
        subtitle="Archivée, une catégorie quitte les listes ; ses transactions la gardent."
      >
        {(['EXPENSE', 'INCOME', 'SAVINGS'] as const).map((kind) => {
          const items = categories.active.filter((category) => category.kind === kind);
          return items.length === 0 ? null : (
            <section key={kind} className="flex flex-col gap-1">
              <h3 className="text-label-12 text-fg-3 uppercase">{KIND_LABELS[kind]}</h3>
              <ul className="flex flex-col">
                {items.map((category) => (
                  <li key={category.id} className="flex items-center gap-2 py-0.5">
                    <span className="min-w-0 flex-1 truncate">{category.name}</span>
                    <Link
                      href={withPanel(`category-${category.id}`)}
                      scroll={false}
                      aria-label={`Renommer « ${category.name} »`}
                      className={buttonClasses({ variant: 'icon' })}
                    >
                      <PencilIcon className="size-4" />
                    </Link>
                    <ActionButton
                      variant="quiet"
                      action={setCategoryArchived.bind(null, category.id, true)}
                    >
                      Archiver
                    </ActionButton>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {categories.archived.length > 0 ? (
          <section className="flex flex-col gap-1">
            <h3 className="text-label-12 text-fg-3 uppercase">Archivées</h3>
            <ul className="flex flex-col">
              {categories.archived.map((category) => (
                <li key={category.id} className="flex items-center gap-2 py-0.5">
                  <span className="min-w-0 flex-1 truncate text-fg-2">{category.name}</span>
                  <ActionButton
                    variant="quiet"
                    action={setCategoryArchived.bind(null, category.id, false)}
                  >
                    Réactiver
                  </ActionButton>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <div className="border-t border-line-subtle pt-3">
          <h3 className="mb-2 text-label-12 text-fg-3 uppercase">Nouvelle catégorie</h3>
          <CategoryForm category={null} closeHref={withPanel('categories')} />
        </div>
      </SidePanel>
      {editingCategory ? (
        <SidePanel
          name={`category-${editingCategory.id}`}
          title={`Renommer « ${editingCategory.name} »`}
        >
          <CategoryForm category={editingCategory} closeHref={withPanel('categories')} />
        </SidePanel>
      ) : null}
    </>
  );
}

// --- Import -------------------------------------------------------------------------------

export async function ImportView() {
  const user = await requireUser();
  const imports = await prisma.csvImport.findMany({
    where: { userId: user.id },
    orderBy: { importedAt: 'desc' },
    take: 5,
  });
  return (
    <>
      <PageHeader
        breadcrumb="Finances"
        title={
          imports.length === 0
            ? 'Importe ton premier relevé bancaire.'
            : `Dernier import le ${formatShortDate(imports[0].importedAt)}.`
        }
      />
      <FinanceTabs />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18.75rem]">
        <ImportWizard />
        <ModuleCard title="Derniers imports">
          {imports.length === 0 ? (
            <p className="text-body-14 text-fg-2">Aucun import pour l’instant.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {imports.map((item) => (
                <li key={item.id} className="flex flex-col">
                  <span className="truncate font-semibold" title={item.fileName}>
                    {item.fileName}
                  </span>
                  <span className="text-caption-12 text-fg-2">
                    {formatShortDate(item.importedAt)} · {item.importedCount} ajoutée
                    {item.importedCount > 1 ? 's' : ''} sur {item.rowCount}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-caption-12 text-fg-3">
            Réimporter un relevé déjà importé n’ajoute rien : les doublons sont reconnus.
          </p>
        </ModuleCard>
      </div>
    </>
  );
}

export function FinanceSkeleton({ variant = 'month' }: { variant?: 'month' | 'list' }) {
  return (
    <LoadingRegion label="Chargement des finances…" className="flex flex-col gap-4">
      <div className="flex min-h-13 flex-col justify-center gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-96 max-w-full" />
      </div>
      <FinanceTabs />
      <Skeleton surface="card" className="h-9 w-64" />
      {variant === 'month' ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} surface="card" className="h-26" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton surface="card" className="h-64" />
            <Skeleton surface="card" className="h-64" />
          </div>
        </>
      ) : (
        <Skeleton surface="card" className="h-96" />
      )}
    </LoadingRegion>
  );
}
