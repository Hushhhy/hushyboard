'use client';

import { useActionState, useId, useState, useTransition } from 'react';
import { saveCategory, saveTransaction, setTransactionCategory } from '@/app/(app)/finance/actions';
import { useFormDone } from '@/components/rewards/use-form-done';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SelectField, TextField } from '@/components/ui/text-field';
import { toDateInputValue } from '@/lib/dates';
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
