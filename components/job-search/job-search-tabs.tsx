import { Tabs } from '@/components/ui/tabs';

// One URL per tab of « Recherches pro ».
export function JobSearchTabs({ activeHref }: { activeHref?: string } = {}) {
  return (
    <Tabs
      label="Sections de Recherches pro"
      activeHref={activeHref}
      items={[
        { href: '/career/job-search', label: 'Candidatures' },
        { href: '/career/job-search/watch', label: 'Veille' },
        { href: '/career/job-search/spontaneous', label: 'Candidatures spontanées' },
        { href: '/career/job-search/analytics', label: 'Analyses' },
      ]}
    />
  );
}
