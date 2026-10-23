import { CareerIcon, FinanceIcon, GamesIcon, HabitsIcon } from '@/components/icons';
import type { Domain } from '@/components/ui/domain';

// Pictogram drawn inside a trophy emblem: the icon of its area.
export function DomainIcon({
  domain,
  className = 'size-4',
}: {
  domain: Domain;
  className?: string;
}) {
  if (domain === 'career') return <CareerIcon className={className} />;
  if (domain === 'habits') return <HabitsIcon className={className} />;
  if (domain === 'leisure') return <GamesIcon className={className} />;
  return <FinanceIcon className={className} />;
}
