import { requireUser } from '@/lib/session';
import { SignOutButton } from './sign-out-button';

// Server component: reads the signed-in user from the session.
export async function AccountMenu() {
  const user = await requireUser();
  const initial = user.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <div className="flex items-center gap-2.5 rounded-[10px] bg-surface-base p-2.5">
      <span
        aria-hidden="true"
        className="grid size-7.5 shrink-0 place-items-center rounded-control bg-career-deep font-semibold text-career"
      >
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-14 font-medium">{user.name}</span>
        <span className="block truncate text-caption-12 text-fg-3">Connecté avec GitHub</span>
      </span>
      <SignOutButton />
    </div>
  );
}

// Shown while the session is being read.
export function AccountMenuPlaceholder() {
  return <div className="h-12.5 rounded-[10px] bg-surface-base" aria-hidden="true" />;
}
