'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { ButtonVariant } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';

// A button that runs one Server Action (id bound) and keeps its error on screen.
export function ActionButton({
  action,
  children,
  variant = 'secondary',
  pendingHint,
  className = '',
}: {
  action: () => Promise<{ error?: string } | void>;
  children: ReactNode;
  variant?: ButtonVariant;
  // Shown while it runs, e.g. « Import de la liste MDN… ».
  pendingHint?: string;
  className?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={variant}
          pending={isPending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await action();
              if (result?.error) setError(result.error);
            });
          }}
        >
          {children}
        </Button>
        {pendingHint ? (
          <span role="status" className="text-caption-12 text-fg-3 empty:hidden">
            {isPending ? pendingHint : ''}
          </span>
        ) : null}
      </div>
      {error ? <ErrorState title={error} announce /> : null}
    </div>
  );
}
