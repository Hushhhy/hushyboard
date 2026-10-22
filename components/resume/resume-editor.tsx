'use client';

import { useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { saveResume, type SaveResumeResult } from '@/app/(app)/career/resume/actions';
import { ChevronDownIcon, ChevronUpIcon, CloseIcon, PlusIcon } from '@/components/icons';
import { Button, buttonClasses } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { TextField } from '@/components/ui/text-field';
import type { ResumeContent } from '@/lib/resume/schema';

// Lists edited as plain text: "a, b, c" and one line per bullet.
const toCommaText = (items: string[]) => items.join(', ');
const fromCommaText = (text: string) =>
  text
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
const toLines = (items: string[]) => items.join('\n');
const fromLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

// French names of the fields, to explain validation errors.
const SECTION_LABELS: Record<string, string> = {
  name: 'Nom de la version',
  header: 'En-tête',
  summary: 'Profil',
  skillGroups: 'Compétences',
  experiences: 'Expériences',
  projects: 'Projets',
  education: 'Formation',
  languages: 'Langues',
  interests: 'Centres d’intérêt',
};

function describeIssue(path: string): string {
  const [, section, index] = path.startsWith('content.') ? path.split('.') : ['', path];
  const label = SECTION_LABELS[section] ?? section;
  return index && /^\d+$/.test(index) ? `${label} n° ${Number(index) + 1}` : label;
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-body-14 font-medium">{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-control border border-line-strong bg-surface-sunken px-3 py-2 text-body-14 text-fg-1"
      />
      {hint ? <span className="text-caption-12 text-fg-3">{hint}</span> : null}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `section-${title}`;
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
    >
      <h2 id={id} className="text-label-12 text-fg-3 uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

// Repeated items (experiences, projects…): edit, reorder, remove, add.
function ListEditor<T>({
  items,
  onChange,
  itemLabel,
  addLabel,
  empty,
  render,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  itemLabel: (item: T, index: number) => string;
  addLabel: string;
  empty: T;
  render: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  const move = (index: number, delta: number) => {
    const next = [...items];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, index) => (
        <fieldset key={index} className="flex flex-col gap-3 rounded-control bg-surface-base p-3">
          <legend className="sr-only">{itemLabel(item, index)}</legend>
          <div className="flex items-center gap-1">
            <p aria-hidden="true" className="flex-1 truncate text-body-14 font-semibold">
              {itemLabel(item, index)}
            </p>
            <Button
              variant="icon"
              aria-label={`Monter ${itemLabel(item, index)}`}
              disabled={index === 0}
              onClick={() => move(index, -1)}
            >
              <ChevronUpIcon className="size-4" />
            </Button>
            <Button
              variant="icon"
              aria-label={`Descendre ${itemLabel(item, index)}`}
              disabled={index === items.length - 1}
              onClick={() => move(index, 1)}
            >
              <ChevronDownIcon className="size-4" />
            </Button>
            <Button
              variant="icon"
              aria-label={`Retirer ${itemLabel(item, index)}`}
              onClick={() => onChange(items.filter((_, other) => other !== index))}
            >
              <CloseIcon className="size-4" />
            </Button>
          </div>
          {render(item, (patch) =>
            onChange(
              items.map((other, otherIndex) =>
                otherIndex === index ? { ...other, ...patch } : other
              )
            )
          )}
        </fieldset>
      ))}
      <Button
        variant="quiet"
        className="-ml-2 self-start"
        onClick={() => onChange([...items, empty])}
      >
        <PlusIcon className="size-4" />
        {addLabel}
      </Button>
    </div>
  );
}

export function ResumeEditor({
  resumeId,
  initialName,
  initialContent,
  imported,
}: {
  resumeId: string;
  initialName: string;
  initialContent: ResumeContent;
  imported: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [content, setContent] = useState(initialContent);
  const [result, setResult] = useState<SaveResumeResult>({});
  const [isPending, startTransition] = useTransition();

  const set = <K extends keyof ResumeContent>(key: K, value: ResumeContent[K]) =>
    setContent((current) => ({ ...current, [key]: value }));
  const setHeader = (patch: Partial<ResumeContent['header']>) =>
    setContent((current) => ({ ...current, header: { ...current.header, ...patch } }));

  function save() {
    startTransition(async () => {
      const response = await saveResume(resumeId, { name, content });
      // On success the action redirects to the CV page.
      if (response) setResult(response);
    });
  }

  const header = content.header;
  return (
    <div className="flex flex-col gap-3">
      {imported ? (
        <p role="status" className="rounded-control bg-surface-raised p-3 text-body-14 text-fg-2">
          L’IA a rempli ce CV à partir de ton PDF. Relis chaque section et corrige ce qui doit
          l’être : elle peut se tromper.
        </p>
      ) : null}
      {result.error ? (
        <ErrorState
          title={result.error}
          description={result.issues
            ?.slice(0, 5)
            .map((issue) => `${describeIssue(issue.path)} : ${issue.message}`)
            .join(' ')}
          announce
        />
      ) : null}

      <Section title="Version">
        <TextField
          label="Nom de la version"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Section>

      <Section title="En-tête">
        <div className="grid gap-3 md:grid-cols-2">
          <TextField
            label="Nom complet"
            value={header.fullName}
            onChange={(e) => setHeader({ fullName: e.target.value })}
          />
          <TextField
            label="Titre visé"
            value={header.title}
            onChange={(e) => setHeader({ title: e.target.value })}
          />
          <TextField
            label="Email"
            type="email"
            value={header.email}
            onChange={(e) => setHeader({ email: e.target.value })}
          />
          <TextField
            label="Téléphone"
            value={header.phone}
            onChange={(e) => setHeader({ phone: e.target.value })}
          />
          <TextField
            label="Ville"
            value={header.location}
            onChange={(e) => setHeader({ location: e.target.value })}
          />
          <TextField
            label="GitHub"
            value={header.github}
            onChange={(e) => setHeader({ github: e.target.value })}
          />
          <TextField
            label="LinkedIn"
            value={header.linkedin}
            onChange={(e) => setHeader({ linkedin: e.target.value })}
          />
          <TextField
            label="Site ou portfolio"
            value={header.website}
            onChange={(e) => setHeader({ website: e.target.value })}
          />
        </div>
      </Section>

      <Section title="Profil">
        <TextArea
          label="Résumé"
          value={content.summary}
          onChange={(value) => set('summary', value)}
          rows={4}
        />
      </Section>

      <Section title="Compétences">
        <ListEditor
          items={content.skillGroups}
          onChange={(items) => set('skillGroups', items)}
          itemLabel={(group, index) => group.name || `Groupe ${index + 1}`}
          addLabel="Ajouter un groupe"
          empty={{ name: '', items: [] }}
          render={(group, update) => (
            <>
              <TextField
                label="Nom du groupe"
                value={group.name}
                onChange={(e) => update({ name: e.target.value })}
              />
              <TextArea
                label="Compétences"
                hint="Séparées par des virgules."
                rows={2}
                value={toCommaText(group.items)}
                onChange={(value) => update({ items: fromCommaText(value) })}
              />
            </>
          )}
        />
      </Section>

      <Section title="Expériences">
        <ListEditor
          items={content.experiences}
          onChange={(items) => set('experiences', items)}
          itemLabel={(item, index) => item.title || `Expérience ${index + 1}`}
          addLabel="Ajouter une expérience"
          empty={{ title: '', organization: '', location: '', start: '', end: '', bullets: [] }}
          render={(item, update) => (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <TextField
                  label="Poste"
                  value={item.title}
                  onChange={(e) => update({ title: e.target.value })}
                />
                <TextField
                  label="Entreprise ou école"
                  value={item.organization}
                  onChange={(e) => update({ organization: e.target.value })}
                />
                <TextField
                  label="Lieu"
                  value={item.location}
                  onChange={(e) => update({ location: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label="Début"
                    placeholder="sept. 2023"
                    value={item.start}
                    onChange={(e) => update({ start: e.target.value })}
                  />
                  <TextField
                    label="Fin"
                    placeholder="en cours"
                    value={item.end}
                    onChange={(e) => update({ end: e.target.value })}
                  />
                </div>
              </div>
              <TextArea
                label="Réalisations"
                hint="Une par ligne."
                value={toLines(item.bullets)}
                onChange={(value) => update({ bullets: fromLines(value) })}
              />
            </>
          )}
        />
      </Section>

      <Section title="Projets">
        <ListEditor
          items={content.projects}
          onChange={(items) => set('projects', items)}
          itemLabel={(item, index) => item.name || `Projet ${index + 1}`}
          addLabel="Ajouter un projet"
          empty={{ name: '', description: '', technologies: [], url: '' }}
          render={(item, update) => (
            <>
              <div className="grid gap-3 md:grid-cols-2">
                <TextField
                  label="Nom"
                  value={item.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
                <TextField
                  label="Lien"
                  value={item.url}
                  onChange={(e) => update({ url: e.target.value })}
                />
              </div>
              <TextArea
                label="Description"
                value={item.description}
                onChange={(value) => update({ description: value })}
                rows={2}
              />
              <TextField
                label="Technologies"
                hint="Séparées par des virgules."
                value={toCommaText(item.technologies)}
                onChange={(e) => update({ technologies: fromCommaText(e.target.value) })}
              />
            </>
          )}
        />
      </Section>

      <Section title="Formation">
        <ListEditor
          items={content.education}
          onChange={(items) => set('education', items)}
          itemLabel={(item, index) => item.degree || `Formation ${index + 1}`}
          addLabel="Ajouter une formation"
          empty={{ degree: '', school: '', start: '', end: '', details: '' }}
          render={(item, update) => (
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                label="Diplôme ou formation"
                value={item.degree}
                onChange={(e) => update({ degree: e.target.value })}
              />
              <TextField
                label="École"
                value={item.school}
                onChange={(e) => update({ school: e.target.value })}
              />
              <TextField
                label="Début"
                value={item.start}
                onChange={(e) => update({ start: e.target.value })}
              />
              <TextField
                label="Fin"
                value={item.end}
                onChange={(e) => update({ end: e.target.value })}
              />
              <TextField
                label="Détails"
                className="md:col-span-2"
                value={item.details}
                onChange={(e) => update({ details: e.target.value })}
              />
            </div>
          )}
        />
      </Section>

      <Section title="Langues">
        <ListEditor
          items={content.languages}
          onChange={(items) => set('languages', items)}
          itemLabel={(item, index) => item.name || `Langue ${index + 1}`}
          addLabel="Ajouter une langue"
          empty={{ name: '', level: '' }}
          render={(item, update) => (
            <div className="grid gap-3 md:grid-cols-2">
              <TextField
                label="Langue"
                value={item.name}
                onChange={(e) => update({ name: e.target.value })}
              />
              <TextField
                label="Niveau"
                placeholder="B2, courant…"
                value={item.level}
                onChange={(e) => update({ level: e.target.value })}
              />
            </div>
          )}
        />
      </Section>

      <Section title="Centres d’intérêt">
        <TextField
          label="Centres d’intérêt"
          hint="Séparés par des virgules."
          value={toCommaText(content.interests)}
          onChange={(e) => set('interests', fromCommaText(e.target.value))}
        />
      </Section>

      <div className="sticky bottom-0 flex items-center gap-2 rounded-card bg-surface-raised p-3 shadow-raised">
        <Button variant="primary" pending={isPending} onClick={save}>
          Enregistrer le CV
        </Button>
        <Link href={`/career/resume?v=${resumeId}`} className={buttonClasses({ variant: 'quiet' })}>
          Annuler
        </Link>
      </div>
    </div>
  );
}
