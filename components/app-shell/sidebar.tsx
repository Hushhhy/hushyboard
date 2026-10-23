import { Suspense, type ReactNode } from 'react';
import {
  AnalyticsIcon,
  CareerIcon,
  CertificationIcon,
  CodeIcon,
  CourseIcon,
  FinanceIcon,
  GamesIcon,
  HabitsIcon,
  HomeIcon,
  LeisureIcon,
  MailIcon,
  ProfileIcon,
  ResumeIcon,
  SearchIcon,
} from '@/components/icons';
import { AccountMenu, AccountMenuPlaceholder } from './account-menu';
import { NavLink } from './nav-link';
import { SidebarFrame } from './sidebar-frame';
import { getInboxUnread } from '@/lib/gmail/read';
import { countOffersToSort } from '@/lib/job-search-data';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

function GroupLabel({
  icon,
  label,
  colorClass,
}: {
  icon: ReactNode;
  label: string;
  colorClass: string;
}) {
  return (
    <p className="flex items-center gap-2 px-2.5 pt-3.5 pb-1.5 text-label-12 text-fg-3 uppercase">
      <span className={colorClass}>{icon}</span>
      {label}
    </p>
  );
}

const JOB_SEARCH_LINK = {
  href: '/career/job-search',
  icon: <SearchIcon />,
  label: 'Recherches pro',
};

const MAIL_LINK = { href: '/mail', icon: <MailIcon />, label: 'Mails' };

// « Mails » with the Gmail inbox unread count (cached 60 s), when Gmail is connected.
async function MailNavLink() {
  const user = await requireUser();
  const connected = await prisma.gmailConnection.count({
    where: { userId: user.id, lastErrorAt: null },
  });
  const count = connected ? await getInboxUnread(user.id) : null;
  return <NavLink {...MAIL_LINK} count={count ?? undefined} />;
}

// « Recherches pro » with the number of offers to sort (read per request).
async function JobSearchNavLink() {
  const user = await requireUser();
  const count = await countOffersToSort(user.id);
  return <NavLink {...JOB_SEARCH_LINK} count={count} />;
}

// Server component: the navigation is the same for every page, only NavLink needs the browser.
export function Sidebar() {
  return (
    <SidebarFrame>
      <p className="flex items-center gap-2.5 px-2.5 pb-4.5 font-display text-display-20">
        <CareerIcon className="size-5.5 text-career" />
        Hushyboard
      </p>

      <nav aria-label="Navigation principale" className="flex flex-col gap-0.5">
        <NavLink href="/" icon={<HomeIcon />} label="Accueil" />
        <Suspense fallback={<NavLink {...MAIL_LINK} />}>
          <MailNavLink />
        </Suspense>

        <GroupLabel
          icon={<CareerIcon className="size-3.5" />}
          label="Carrière"
          colorClass="text-career"
        />
        <NavLink href="/career/profile" icon={<ProfileIcon />} label="Profil" />
        <NavLink href="/career/projects" icon={<CodeIcon />} label="Projets" />
        <NavLink href="/career/resume" icon={<ResumeIcon />} label="CV" />
        <NavLink
          href="/career/certifications"
          icon={<CertificationIcon />}
          label="Certifications"
        />
        <NavLink href="/career/courses" icon={<CourseIcon />} label="Cours" />
        <Suspense fallback={<NavLink {...JOB_SEARCH_LINK} />}>
          <JobSearchNavLink />
        </Suspense>
        <NavLink href="/career/progress" icon={<AnalyticsIcon />} label="Progression" />

        <div className="h-3" />
        <NavLink
          href="/habits"
          icon={<HabitsIcon />}
          label="Habitudes & objectifs"
          iconColorClass="text-habits"
        />

        <GroupLabel
          icon={<LeisureIcon className="size-3.5" />}
          label="Loisirs"
          colorClass="text-leisure"
        />
        <NavLink href="/leisure/games" icon={<GamesIcon />} label="Jeux vidéo" />

        <div className="h-3" />
        <NavLink
          href="/finance"
          icon={<FinanceIcon />}
          label="Finances"
          iconColorClass="text-finance"
        />
      </nav>

      <div className="mt-auto">
        <Suspense fallback={<AccountMenuPlaceholder />}>
          <AccountMenu />
        </Suspense>
      </div>
    </SidebarFrame>
  );
}
