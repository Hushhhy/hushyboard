import { useId, type ComponentProps } from 'react';
import { FieldError } from './error-state';

type TextFieldProps = Omit<ComponentProps<'input'>, 'id'> & {
  label: string;
  // Error under the field (from the server action), linked with aria-describedby.
  error?: string;
  hint?: string;
};

// Labelled text input. The label is always visible; errors stay until the field is fixed.
export function TextField({ label, error, hint, className = '', ...props }: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-body-14 font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="h-9 rounded-control border border-line-strong bg-surface-sunken px-3 text-body-14 text-fg-1 placeholder:text-fg-3"
        {...props}
      />
      {hint ? (
        <p id={hintId} className="text-caption-12 text-fg-3">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

type SelectFieldProps = Omit<ComponentProps<'select'>, 'id'> & {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
};

export function SelectField({ label, options, error, className = '', ...props }: SelectFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={id} className="text-body-14 font-medium">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-9 rounded-control border border-line-strong bg-surface-sunken px-2 text-body-14 text-fg-1"
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}
