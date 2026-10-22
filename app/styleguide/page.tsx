import { Suspense, type ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { CareerIcon, FinanceIcon, HabitsIcon, LeisureIcon, PlusIcon } from '@/components/icons';
import { BarChart } from '@/components/ui/bar-row';
import { Button } from '@/components/ui/button';
import { HabitCheckbox, PausedHabit } from '@/components/ui/checkbox';
import { Chip, Tag } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState, FieldError } from '@/components/ui/error-state';
import { KeyValueList } from '@/components/ui/key-value-list';
import { LevelMedal } from '@/components/ui/level-medal';
import { MonthPicker } from '@/components/ui/month-picker';
import { Ruler } from '@/components/ui/ruler';
import { LoadingRegion, Skeleton } from '@/components/ui/skeleton';
import { StatusFilterPill, StatusPill } from '@/components/ui/status-pill';
import { Tabs } from '@/components/ui/tabs';
import { Trophy, TrophyShelf } from '@/components/ui/trophy';
import { RewardsProvider } from '@/components/rewards/rewards-provider';
import { isMonthKey } from '@/lib/dates';
import { InteractiveDemos } from './interactive-demos';

const STATUSES = [
  'SENT',
  'WAITING',
  'HR_INTERVIEW',
  'TECH_INTERVIEW',
  'OFFER',
  'REJECTED',
  'NO_RESPONSE',
] as const;

// Development-only page to see and test every shared component. Not served in production.
export default function StyleguidePage({ searchParams }: PageProps<'/styleguide'>) {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <RewardsProvider>
      <main id="content" className="mx-auto flex max-w-300 flex-col gap-10 p-8">
        <header className="flex flex-col gap-1">
          <p className="text-label-12 text-fg-3 uppercase">Développement uniquement</p>
          <h1 className="font-display text-display-30">Composants partagés</h1>
        </header>

        <Section title="Boutons">
          <Button variant="primary">Reprendre le cours</Button>
          <Button>Postulé</Button>
          <Button variant="quiet">Détail</Button>
          <Button variant="icon" aria-label="Ajouter">
            <PlusIcon className="size-4" />
          </Button>
          <Button disabled>Désactivé</Button>
          <Button pending>Enregistrement</Button>
        </Section>

        <Section title="Pastilles de statut">
          {STATUSES.map((status) => (
            <StatusPill key={status} status={status} />
          ))}
          <StatusFilterPill status="HR_INTERVIEW" pressed />
          <StatusFilterPill status="REJECTED" pressed={false} />
        </Section>

        <Section title="Cases d'habitude" column>
          <HabitCheckbox label="Lire 20 minutes" defaultChecked />
          <HabitCheckbox
            label="Marcher"
            aside={<span className="text-caption-12 text-fg-3">Série : 4 jours</span>}
          />
          <PausedHabit label="Course à pied" until="19 octobre" />
        </Section>

        <Section title="Réglettes" column>
          <Ruler
            value={340}
            max={500}
            label="Expérience du niveau"
            valueText="340 XP sur 500, niveau 4, Timonier"
            colorClass="bg-career"
          />
          <Ruler
            value={2}
            max={3}
            segments={3}
            label="Habitudes du jour"
            colorClass="bg-habits"
            size="small"
          />
          <Ruler
            value={1}
            max={5}
            segments={5}
            partialIndex={1}
            label="JavaScript"
            valueText="Niveau 1 sur 5, niveau suivant commencé"
            colorClass="bg-career"
            size="small"
            className="w-40"
          />
        </Section>

        <Section title="Barres" column>
          <div className="w-80">
            <BarChart
              caption="Réponses à tes 20 candidatures"
              rows={[
                { key: 'a', label: 'Sans réponse', value: 11, colorClass: 'bg-fg-3' },
                { key: 'b', label: 'Refus', value: 6, colorClass: 'bg-danger' },
                { key: 'c', label: 'Entretiens', value: 3, colorClass: 'bg-info' },
              ]}
            />
          </div>
        </Section>

        <Section title="Onglets et mois" column>
          <Tabs
            label="Exemple"
            items={[
              { href: '/styleguide', label: 'Composants' },
              { href: '/', label: 'Accueil' },
            ]}
          />
          <Suspense fallback={<Skeleton className="h-8 w-48" />}>
            <MonthDemo searchParams={searchParams} />
          </Suspense>
        </Section>

        <Section title="Médaille et trophées">
          <LevelMedal level={4} />
          <LevelMedal level={5} size="small" />
          <LevelMedal level={5} size="small" upcoming />
          <div className="w-full">
            <TrophyShelf>
              <li>
                <Trophy
                  name="Premier pas"
                  domain="career"
                  detail="15 oct."
                  unlocked
                  icon={<CareerIcon className="size-4" />}
                />
              </li>
              <li>
                <Trophy
                  name="Sept jours"
                  domain="habits"
                  detail="Série de 7 jours"
                  unlocked
                  icon={<HabitsIcon className="size-4" />}
                />
              </li>
              <li>
                <Trophy
                  name="Fin de quête"
                  domain="leisure"
                  detail="Termine un jeu"
                  unlocked={false}
                  icon={<LeisureIcon className="size-4" />}
                />
              </li>
              <li>
                <Trophy
                  name="Premier mois"
                  domain="finance"
                  detail="Importe un relevé"
                  unlocked={false}
                  icon={<FinanceIcon className="size-4" />}
                />
              </li>
            </TrophyShelf>
          </div>
        </Section>

        <Section title="Puces et étiquettes">
          <Chip tone="neutral">VS Code</Chip>
          <Chip tone="info">Vercel</Chip>
          <Chip tone="success" pressed>
            Git
          </Chip>
          <Chip count={4}>Welcome to the Jungle</Chip>
          <Tag>React</Tag>
          <Tag tone="success">TypeScript</Tag>
          <Tag tone="warning">Docker</Tag>
        </Section>

        <Section title="Clé et valeur" column>
          <KeyValueList
            className="max-w-110"
            items={[
              { key: 'target', label: 'Domaine visé', value: 'Full stack et/ou data engineer' },
              { key: 'search', label: 'Recherche actuelle', value: 'Full stack uniquement' },
              { key: 'zone', label: 'Zone', value: 'France et Europe' },
            ]}
          />
        </Section>

        <Section title="États" column>
          <EmptyState
            variant="block"
            icon={<FinanceIcon className="size-7 text-finance" />}
            title="Novembre est vide."
            description="Importe le relevé CSV de ta banque ou saisis une dépense."
            action={{ label: 'Importer un relevé', href: '/finance/import' }}
          />
          <ErrorState
            title="Import impossible."
            description="Le fichier n'est pas un CSV. Exporte le relevé au format CSV depuis ta banque."
            action={<Button>Réessayer</Button>}
          />
          <div className="flex max-w-80 flex-col gap-1">
            <label htmlFor="demo-amount" className="text-body-14 font-medium">
              Montant
            </label>
            <input
              id="demo-amount"
              aria-invalid="true"
              aria-describedby="demo-amount-error"
              defaultValue="12,5,0"
              className="h-9 rounded-control border border-line-strong bg-surface-sunken px-3"
            />
            <FieldError id="demo-amount-error">Saisis un montant, par exemple 12,50.</FieldError>
          </div>
          <LoadingRegion
            label="Chargement de l'exemple…"
            className="flex max-w-80 flex-col gap-2 rounded-card bg-surface-default p-4"
          >
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </LoadingRegion>
        </Section>

        <Section title="Interactions" column>
          <InteractiveDemos />
        </Section>
      </main>
    </RewardsProvider>
  );
}

async function MonthDemo({
  searchParams,
}: {
  searchParams: PageProps<'/styleguide'>['searchParams'];
}) {
  const { month } = await searchParams;
  const current = typeof month === 'string' && isMonthKey(month) ? month : '2026-10';
  return <MonthPicker month={current} min="2026-01" max="2026-10" basePath="/styleguide" />;
}

function Section({
  title,
  column = false,
  children,
}: {
  title: string;
  column?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-label-12 text-fg-3 uppercase">{title}</h2>
      <div
        className={`flex gap-3 rounded-card bg-surface-default p-4 ${
          column ? 'flex-col' : 'flex-wrap items-center'
        }`}
      >
        {children}
      </div>
    </section>
  );
}
