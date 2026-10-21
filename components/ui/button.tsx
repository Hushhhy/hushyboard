import type { ComponentProps } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'icon';

const BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-control text-body-14 font-semibold whitespace-nowrap ' +
  'transition-[background-color,border-color,color,translate] duration-(--duration-tick) ease-out-soft ' +
  'disabled:cursor-default disabled:opacity-55 aria-disabled:cursor-default aria-disabled:opacity-55';

const VARIANTS: Record<ButtonVariant, string> = {
  // One primary button per screen.
  primary: 'h-9 px-4 bg-action text-on-action hover:bg-action-hover active:translate-y-px',
  secondary: 'h-9 px-4 border border-line-subtle text-fg-1 hover:border-line-strong',
  quiet:
    'h-9 px-2 text-fg-2 underline decoration-transparent underline-offset-3 hover:text-fg-1 hover:decoration-current',
  // Square 32×32 for close, previous month… Always give it an aria-label.
  icon: 'size-8 text-fg-2 hover:bg-surface-overlay hover:text-fg-1',
};

type ButtonStyleOptions = {
  variant?: ButtonVariant;
  // Secondary button sitting on an overlay (toast, panel): one step lighter.
  onOverlay?: boolean;
  // 32px high, for toasts and dense rows.
  small?: boolean;
};

// Classes of a button, also used to style a <Link> that looks like a button.
export function buttonClasses({
  variant = 'secondary',
  onOverlay = false,
  small = false,
}: ButtonStyleOptions = {}): string {
  const surface =
    variant === 'secondary' ? (onOverlay ? 'bg-surface-control' : 'bg-surface-overlay') : '';
  const size = small && variant !== 'icon' ? 'h-8!' : '';
  return `${BASE} ${VARIANTS[variant]} ${surface} ${size}`;
}

type ButtonProps = ComponentProps<'button'> &
  ButtonStyleOptions & {
    // While a form or action is running: the label stays, followed by "…".
    pending?: boolean;
  };

export function Button({
  variant,
  onOverlay,
  small,
  pending = false,
  className = '',
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`${buttonClasses({ variant, onOverlay, small })} ${className}`}
      {...props}
    >
      {children}
      {pending ? <span aria-hidden="true">…</span> : null}
    </button>
  );
}
