import type { z } from 'zod';
import type { LevelUp } from '@/lib/xp';

// What a form Server Action returns to useActionState.
export type FormState = {
  // Error shown at the top of the form (e.g. "Ce nom existe déjà.").
  error?: string;
  // One message per field, shown under the field.
  fieldErrors?: Record<string, string>;
  // Last submitted values, so the form keeps what Alex typed after an error.
  values?: Record<string, string>;
  // Set on success (a new number each time) so the client can close the panel.
  done?: number;
  // Level reached thanks to this save, announced by the reward toast.
  levelUp?: LevelUp | null;
};

export const EMPTY_FORM_STATE: FormState = {};

// Keeps the first message of each field.
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!(key in result)) result[key] = issue.message;
  }
  return result;
}

// FormData → plain object of trimmed strings (files are ignored).
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string' && !key.startsWith('$')) values[key] = value.trim();
  }
  return values;
}
