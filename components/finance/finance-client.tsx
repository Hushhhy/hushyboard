'use client';

import { useActionState, useId, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  importTransactions,
  previewImport,
  saveCategory,
  saveTransaction,
  setTransactionCategory,
  type LineStatus,
} from '@/app/(app)/finance/actions';
import { UploadIcon } from '@/components/icons';
import { useFormDone } from '@/components/rewards/use-form-done';
import { Button, buttonClasses } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SelectField, TextField } from '@/components/ui/text-field';
import { toDateInputValue } from '@/lib/dates';
import { formatSignedEuros } from '@/lib/finance';
import {
  detectFormat,
  guessMapping,
  mapRows,
  parseCsv,
  type CsvMapping,
  type CsvTable,
  type ParsedLine,
} from '@/lib/finance-csv';
import { EMPTY_FORM_STATE } from '@/lib/forms';

export type CategoryOption = { id: string; name: string; kind: 'EXPENSE' | 'INCOME' | 'SAVINGS' };

const KIND_LABELS = { EXPENSE: 'Dépense', INCOME: 'Revenu', SAVINGS: 'Épargne' } as const;

export type TransactionFormValue = {
  id: string;
  date: Date;
  label: string;
  amountCents: number;
  categoryId: string | null;
  notes: string | null;
};

// « Ajouter une dépense » and the edit form.
export function TransactionForm({
  transaction,
  categories,
  closeHref,
}: {
  transaction: TransactionFormValue | null;
  categories: CategoryOption[];
  closeHref: string;
}) {
  const [state, formAction, isPending] = useActionState(saveTransaction, EMPTY_FORM_STATE);
  useFormDone(state, closeHref);
  const value = (name: string, fallback: string) => state.values?.[name] ?? fallback;
  const id = useId();
  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {state.error ? <ErrorState title={state.error} announce /> : null}
      {transaction ? <input type="hidden" name="id" value={transaction.id} /> : null}
      <SelectField
        name="type"
        label="Type"
        options={[
          { value: 'expense', label: 'Dépense (ou virement vers l’épargne)' },
          { value: 'income', label: 'Revenu' },
        ]}
        defaultValue={value(
          'type',
          transaction && transaction.amountCents > 0 ? 'income' : 'expense'
        )}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          name="amount"
          label="Montant (€)"
          inputMode="decimal"
          placeholder="12,50"
          defaultValue={value(
            'amount',
            transaction
              ? (Math.abs(transaction.amountCents) / 100).toFixed(2).replace('.', ',')
              : ''
          )}
          error={state.fieldErrors?.amount}
        />
        <TextField
          name="date"
          type="date"
          label="Date"
          defaultValue={value('date', toDateInputValue(transaction?.date ?? new Date()))}
          error={state.fieldErrors?.date}
        />
      </div>
      <TextField
        name="label"
        label="Libellé"
        placeholder="Boulangerie"
        defaultValue={value('label', transaction?.label ?? '')}
        error={state.fieldErrors?.label}
      />
      <SelectField
        name="categoryId"
        label="Catégorie"
        options={[
          { value: '', label: 'À classer' },
          ...categories.map((category) => ({
            value: category.id,
            label: `${category.name} · ${KIND_LABELS[category.kind]}`,
          })),
        ]}
        defaultValue={value('categoryId', transaction?.categoryId ?? '')}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-notes`} className="text-body-14 font-medium">
          Notes
        </label>
        <textarea
          id={`${id}-notes`}
          name="notes"
          rows={2}
          defaultValue={value('notes', transaction?.notes ?? '')}
          className="rounded-control border border-line-strong bg-surface-sunken px-3 py-2 text-body-14"
        />
      </div>
      <div className="mt-2">
        <Button type="submit" onOverlay pending={isPending}>
          {transaction ? 'Enregistrer' : 'Ajouter'}
        </Button>
      </div>
    </form>
  );
}

// Category of a row, changed in place (« À classer » lines are flagged).
export function CategoryCell({
  transactionId,
  categoryId,
  categories,
  label,
}: {
  transactionId: string;
  categoryId: string | null;
  categories: CategoryOption[];
  label: string;
}) {
  const [value, setValue] = useState(categoryId ?? '');
  const [, startTransition] = useTransition();
  return (
    <select
      aria-label={`Catégorie de « ${label} »`}
      value={value}
      onChange={(event) => {
        const next = event.target.value;
        setValue(next);
        startTransition(() => setTransactionCategory(transactionId, next));
      }}
      className={`relative z-10 h-8 max-w-44 rounded-control border bg-surface-sunken px-1.5 text-caption-12 ${
        value ? 'border-line-subtle text-fg-1' : 'border-warning font-semibold text-warning'
      }`}
    >
      <option value="">À classer</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );
}

// « Nouvelle catégorie » and rename.
export function CategoryForm({
  category,
  closeHref,
}: {
  category: CategoryOption | null;
  closeHref: string;
}) {
  const [state, formAction, isPending] = useActionState(saveCategory, EMPTY_FORM_STATE);
  useFormDone(state, closeHref);
  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <TextField
        name="name"
        label="Nom"
        defaultValue={state.values?.name ?? category?.name ?? ''}
        error={state.fieldErrors?.name}
      />
      <SelectField
        name="kind"
        label="Type"
        options={Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))}
        defaultValue={state.values?.kind ?? category?.kind ?? 'EXPENSE'}
      />
      <Button type="submit" onOverlay pending={isPending} className="self-start">
        {category ? 'Enregistrer' : 'Ajouter la catégorie'}
      </Button>
    </form>
  );
}

const STATUS_TEXT: Record<LineStatus, string> = {
  new: 'Nouvelle',
  duplicate: 'Doublon, ignorée',
  merged: 'Déjà saisie à la main, fusionnée',
};

// CSV import in three steps. The file is read here, in the browser, and never uploaded:
// only the parsed lines go to the server.
export function ImportWizard() {
  const [fileName, setFileName] = useState('');
  const [table, setTable] = useState<CsvTable | null>(null);
  const [mapping, setMapping] = useState<CsvMapping | null>(null);
  const [statuses, setStatuses] = useState<LineStatus[] | null>(null);
  const [ignoreInvalid, setIgnoreInvalid] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    merged: number;
    duplicates: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const id = useId();

  const lines: ParsedLine[] = table && mapping ? mapRows(table.rows, mapping) : [];
  const valid = lines.filter((line): line is Extract<ParsedLine, { ok: true }> => line.ok);
  const invalid = lines.filter(
    (line): line is Extract<ParsedLine, { ok: false; ignored?: false }> => !line.ok && !line.ignored
  );
  // 0,00 € lines (card checks, cancelled payments): set aside, not errors.
  const zero = lines.filter((line) => !line.ok && line.ignored).length;
  const format = table ? detectFormat(table.headers) : null;
  const payload = valid.map(({ date, label, amountCents }) => ({ date, label, amountCents }));

  function reset() {
    setTable(null);
    setMapping(null);
    setStatuses(null);
    setResult(null);
    setError(null);
    setIgnoreInvalid(false);
  }

  async function readFile(file: File) {
    reset();
    if (file.size > 5 * 1024 * 1024) return setError('Le fichier dépasse 5 Mo.');
    const parsed = parseCsv(await file.text());
    if (parsed.headers.length < 3 || parsed.rows.length === 0) {
      return setError(
        'Ce fichier ne ressemble pas à un relevé CSV (en-tête et lignes introuvables).'
      );
    }
    setFileName(file.name);
    setTable(parsed);
    setMapping(guessMapping(parsed.headers, parsed.rows));
  }

  function preview(nextMapping: CsvMapping) {
    setMapping(nextMapping);
    setStatuses(null);
    setResult(null);
  }

  const columnSelect = (key: keyof CsvMapping, label: string, optional = false) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`${id}-${key}`} className="text-body-14 font-medium">
        {label}
      </label>
      <select
        id={`${id}-${key}`}
        value={mapping?.[key] ?? -1}
        onChange={(event) => {
          const index = Number(event.target.value);
          const next = { ...mapping!, [key]: index === -1 ? null : index };
          // One signed amount column, or debit + credit.
          if (key === 'amount' && index !== -1) Object.assign(next, { debit: null, credit: null });
          if ((key === 'debit' || key === 'credit') && index !== -1) next.amount = null;
          preview(next);
        }}
        className="h-9 rounded-control border border-line-strong bg-surface-sunken px-2 text-body-14"
      >
        {optional ? <option value={-1}>— ignorer —</option> : null}
        {table!.headers.map((header, index) => (
          <option key={index} value={index}>
            {header || `Colonne ${index + 1}`}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <section
        aria-labelledby={`${id}-step1`}
        className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
      >
        <h2
          id={`${id}-step1`}
          className="flex items-center gap-2 text-label-12 text-fg-3 uppercase"
        >
          <UploadIcon className="size-4 text-finance" />
          Étape 1 sur 3 · Choisir le relevé
        </h2>
        <label className={`${buttonClasses()} cursor-pointer self-start`}>
          Choisir un fichier CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
              event.target.value = '';
            }}
          />
        </label>
        <p className="text-caption-12 text-fg-3">
          Exporte le relevé en CSV depuis ta banque. Il est lu sur ton ordinateur : le fichier n’est
          jamais envoyé ni conservé, seules les opérations sont enregistrées.
        </p>
        {error ? <ErrorState title={error} announce /> : null}
      </section>

      {table && mapping ? (
        <section
          aria-labelledby={`${id}-step2`}
          className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
        >
          <h2
            id={`${id}-step2`}
            className="flex items-center gap-2 text-label-12 text-fg-3 uppercase"
          >
            <span className="flex-1">Étape 2 sur 3 · Associer les colonnes</span>
            <span className="normal-case">
              {fileName} · {table.rows.length} ligne{table.rows.length > 1 ? 's' : ''}
            </span>
          </h2>
          {format === 'revolut' ? (
            <p className="text-caption-12 text-fg-2">
              Relevé Revolut reconnu : colonnes date, description et « Argent entrant/sortant »
              choisies, solde et frais écartés. Seul le premier tableau du fichier (le compte
              principal) est lu.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {columnSelect('date', 'Date')}
            {columnSelect('label', 'Libellé')}
            {columnSelect('amount', 'Montant (signé)', true)}
            {columnSelect('debit', 'Débit', true)}
            {columnSelect('credit', 'Crédit', true)}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-140 text-body-14">
              <caption className="sr-only">Aperçu des premières lignes</caption>
              <thead>
                <tr className="text-left text-caption-12 text-fg-3">
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Ligne
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Date
                  </th>
                  <th scope="col" className="py-2 pr-3 font-medium">
                    Libellé
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Montant
                  </th>
                  <th scope="col" className="py-2 pl-4 font-medium">
                    Résultat
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.slice(0, 8).map((line) => {
                  const validIndex = line.ok ? valid.indexOf(line) : -1;
                  const status = statuses && validIndex !== -1 ? statuses[validIndex] : null;
                  return (
                    <tr key={line.line} className="border-t border-line-subtle">
                      <td className="py-2 pr-3 text-fg-3 tabular">{line.line}</td>
                      {line.ok ? (
                        <>
                          <td className="py-2 pr-3 whitespace-nowrap tabular">
                            {line.date.split('-').reverse().join('/')}
                          </td>
                          <td className="max-w-80 truncate py-2 pr-3">{line.label}</td>
                          <td className="py-2 text-right tabular">
                            {formatSignedEuros(line.amountCents)}
                          </td>
                          <td
                            className={`py-2 pl-4 text-caption-12 ${status === 'new' ? 'text-success' : 'text-fg-3'}`}
                          >
                            {status ? STATUS_TEXT[status] : '—'}
                          </td>
                        </>
                      ) : (
                        <td
                          colSpan={4}
                          className={`py-2 text-caption-12 ${line.ignored ? 'text-fg-3' : 'text-danger'}`}
                        >
                          {line.ignored ? 'Ignorée' : 'Illisible'} : {line.error}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {zero > 0 ? (
            <p className="text-caption-12 text-fg-2">
              {zero} ligne{zero > 1 ? 's' : ''} ignorée{zero > 1 ? 's' : ''} : montant nul (0,00 €).
            </p>
          ) : null}
          {invalid.length > 0 ? (
            <ErrorState
              title={`${invalid.length} ligne${invalid.length > 1 ? 's' : ''} ne peu${invalid.length > 1 ? 'vent' : 't'} pas être importée${invalid.length > 1 ? 's' : ''}.`}
              description={`${invalid
                .slice(0, 5)
                .map((line) => `ligne ${line.line} : ${line.error}`)
                .join(' ; ')}${invalid.length > 5 ? '…' : ''}. Corrige le fichier ou ignore-les.`}
              action={
                <label className="flex items-center gap-2 text-body-14">
                  <input
                    type="checkbox"
                    checked={ignoreInvalid}
                    onChange={(event) => setIgnoreInvalid(event.target.checked)}
                    className="size-4 accent-finance"
                  />
                  Ignorer ces lignes
                </label>
              }
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              pending={isPending && !statuses}
              disabled={valid.length === 0}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const response = await previewImport(payload);
                  if (response.error) setError(response.error);
                  else setStatuses(response.statuses ?? null);
                })
              }
            >
              Vérifier les doublons
            </Button>
            {statuses ? (
              <span className="text-caption-12 text-fg-2">
                {statuses.filter((status) => status === 'new').length} nouvelle(s),{' '}
                {statuses.filter((status) => status === 'duplicate').length} doublon(s),{' '}
                {statuses.filter((status) => status === 'merged').length} fusionnée(s).
              </span>
            ) : null}
          </div>
        </section>
      ) : null}

      {table && statuses ? (
        <section className="flex flex-col gap-3 rounded-card bg-surface-default p-4">
          <h2 className="text-label-12 text-fg-3 uppercase">Étape 3 sur 3 · Importer</h2>
          {result ? (
            <div role="status" className="flex flex-col gap-2">
              <p className="font-semibold">
                {result.imported} opération{result.imported > 1 ? 's' : ''} importée
                {result.imported > 1 ? 's' : ''}, {result.merged} fusionnée
                {result.merged > 1 ? 's' : ''}, {result.duplicates} doublon
                {result.duplicates > 1 ? 's' : ''} ignoré{result.duplicates > 1 ? 's' : ''}.
              </p>
              <div className="flex gap-2">
                <Link
                  href="/finance/transactions?filter=uncategorized"
                  className={buttonClasses({ variant: 'primary' })}
                >
                  Classer les opérations
                </Link>
                <Button variant="quiet" onClick={reset}>
                  Importer un autre relevé
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="primary"
              className="self-start"
              pending={isPending}
              disabled={invalid.length > 0 && !ignoreInvalid}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const response = await importTransactions(fileName, payload, table.rows.length);
                  if (response.error) setError(response.error);
                  else
                    setResult({
                      imported: response.imported ?? 0,
                      merged: response.merged ?? 0,
                      duplicates: response.duplicates ?? 0,
                    });
                })
              }
            >
              Importer {valid.length} opération{valid.length > 1 ? 's' : ''}
            </Button>
          )}
          {error ? <ErrorState title={error} announce /> : null}
        </section>
      ) : null}
    </div>
  );
}
