'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavLinkProps = {
  href: string;
  icon: ReactNode;
  label: string;
  // Color of the icon when inactive (domain color for Habits and Finance).
  iconColorClass?: string;
  count?: number;
};

// Client component: it needs the current URL (usePathname) to know whether it is the active page.
export function NavLink({ href, icon, label, iconColorClass = 'text-fg-3', count }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`relative flex h-8.5 items-center gap-2.5 rounded-control px-2.5 font-medium transition-colors duration-(--duration-tick) ${
        isActive
          ? 'bg-surface-raised text-fg-1 before:absolute before:inset-y-2 before:-left-3 before:w-0.75 before:rounded-r-sm before:bg-fg-1'
          : 'text-fg-2 hover:bg-surface-default hover:text-fg-1'
      }`}
    >
      <span className={isActive ? 'text-fg-1' : iconColorClass}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {count ? <span className="text-caption-12 text-fg-3 tabular">{count}</span> : null}
    </Link>
  );
}
