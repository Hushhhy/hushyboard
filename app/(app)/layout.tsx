import type { ReactNode } from 'react';
import { Sidebar } from '@/components/app-shell/sidebar';

// Shared frame for every page of the app (not for /login).
// The "(app)" folder is a route group: the parentheses keep it out of the URL.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
