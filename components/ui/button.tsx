import type { ComponentProps } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'px-4 bg-action text-on-action hover:bg-action-hover',
  secondary: 'px-4 border border-line-subtle bg-surface-overlay text-fg-1 hover:border-line-strong',
  ghost: 'px-2 text-fg-2 underline-offset-2 hover:text-fg-1 hover:underline',
};

type ButtonProps = ComponentProps<'button'> & { variant?: Variant };

export function Button({ variant = 'secondary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-control text-body-14 font-semibold whitespace-nowrap transition-colors duration-(--duration-tick) active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
