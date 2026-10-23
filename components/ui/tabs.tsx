'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type TabItem = { href: string; label: string };

type TabsProps = {
  label: string;
  items: TabItem[];
  // Forces the active tab when the URL is not under it (e.g. an offer page under « Veille »).
  activeHref?: string;
};

// Link tabs: one URL per tab (back button and sharing work, no ARIA tab pattern).
// Client component: it needs the current URL to mark the active tab. The URL read sits in
// <Suspense> so dynamic routes keep a static shell (fallback = no active tab).
export function Tabs(props: TabsProps) {
  if (props.activeHref) return <TabsBody {...props} active={props.activeHref} />;
  return (
    <Suspense fallback={<TabsBody {...props} active={undefined} />}>
      <ActiveTabs {...props} />
    </Suspense>
  );
}

function ActiveTabs(props: TabsProps) {
  const pathname = usePathname();
  // The longest matching href wins, so "/habits" is not active on "/habits/history".
  const active = props.items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return <TabsBody {...props} active={active} />;
}

function TabsBody({ label, items, active }: TabsProps & { active: string | undefined }) {
  return (
    <nav aria-label={label} className="border-b border-line-subtle">
      <ul className="flex gap-1">
        {items.map((item) => {
          const isActive = item.href === active;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`relative block px-2 pt-2 pb-3 text-body-14 transition-colors duration-(--duration-tick) ${
                  isActive
                    ? 'font-semibold text-fg-1 after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-tick after:bg-fg-1'
                    : 'font-medium text-fg-2 hover:text-fg-1'
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
