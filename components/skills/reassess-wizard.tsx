'use client';

import { useRef, useState, useTransition } from 'react';
import { saveAssessment } from '@/app/(app)/career/profile/actions';
import { Button } from '@/components/ui/button';
import { computeSkillLevel, formatSkillLevel, shouldStopAssessment } from '@/lib/skills';
import type { TierView } from './tier-view';

type Question = { id: string; label: string; checked: boolean; level: number; title: string };

// Guided re-evaluation, notion by notion in roadmap order. It stops after the first level
// with 2 « Non » or more: the next levels keep their current checks. The answers then
// replace the checks and a dated snapshot is saved.
export function ReassessWizard({ skillId, tiers }: { skillId: string; tiers: TierView[] }) {
  const questions: Question[] = [...tiers]
    .sort((a, b) => a.level - b.level)
    .flatMap((tier) =>
      tier.notions.map((notion) => ({ ...notion, level: tier.level, title: tier.title }))
    );
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [stoppedAt, setStoppedAt] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [isPending, startTransition] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);

  if (questions.length === 0) {
    return (
      <p className="text-body-14 text-fg-2">
        Aucune notion à évaluer. Ajoute d&apos;abord des notions à la roadmap.
      </p>
    );
  }

  // Unasked notions keep their current state.
  const isKnown = (question: Question) => answers[question.id] ?? question.checked;
  const result = computeSkillLevel(
    tiers.map((tier) => ({
      level: tier.level,
      title: tier.title,
      notions: tier.notions.map((notion) => ({
        label: notion.label,
        checked: answers[notion.id] ?? notion.checked,
      })),
    }))
  );

  function focusHeading() {
    // Keep keyboard and screen reader users at the top of the new step.
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function answer(known: boolean) {
    const question = questions[index];
    const next = { ...answers, [question.id]: known };
    setAnswers(next);
    const isLastOfLevel =
      index === questions.length - 1 || questions[index + 1].level !== question.level;
    if (isLastOfLevel) {
      const levelAnswers = questions
        .filter((item) => item.level === question.level)
        .map((item) => next[item.id] ?? item.checked);
      if (shouldStopAssessment(levelAnswers) && index < questions.length - 1) {
        setStoppedAt(question.level);
        setFinished(true);
        focusHeading();
        return;
      }
      if (index === questions.length - 1) {
        setFinished(true);
        focusHeading();
        return;
      }
    }
    setIndex(index + 1);
    focusHeading();
  }

  function save() {
    const known = questions.filter(isKnown).map((question) => question.id);
    startTransition(async () => {
      await saveAssessment(skillId, known);
    });
  }

  if (finished) {
    return (
      <div className="flex flex-col gap-4">
        <h3 ref={headingRef} tabIndex={-1} className="text-body-16 font-semibold">
          Résultat : niveau <span className="tabular">{formatSkillLevel(result)}</span>
        </h3>
        <p className="text-body-14 text-fg-2">
          {stoppedAt !== null
            ? `Arrêt après le niveau ${stoppedAt} : au moins 2 « Non ». Les niveaux suivants gardent leurs coches actuelles.`
            : 'Toutes les notions sont passées.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onOverlay pending={isPending} onClick={save}>
            Enregistrer l&apos;évaluation
          </Button>
          <Button
            onOverlay
            variant="quiet"
            onClick={() => {
              setFinished(false);
              setStoppedAt(null);
              focusHeading();
            }}
          >
            Revenir aux questions
          </Button>
        </div>
      </div>
    );
  }

  const question = questions[index];
  const previous = answers[question.id];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-caption-12 text-fg-3 tabular">
        Question {index + 1} sur {questions.length} · Niveau {question.level} · {question.title}
      </p>
      <h3 ref={headingRef} tabIndex={-1} className="font-display text-display-20">
        {question.label}
      </h3>
      <p className="text-body-14 text-fg-2">
        Sais-tu faire ça sans aide, sans tutoriel et sans IA ?
      </p>
      <p className="text-caption-12 text-fg-3">
        {previous !== undefined
          ? `Ta réponse : ${previous ? 'Oui' : 'Non'}`
          : `Actuellement : ${question.checked ? 'sue' : 'à apprendre'}`}
      </p>

      <div className="flex flex-wrap gap-2">
        <Button onOverlay variant="secondary" onClick={() => answer(true)}>
          Oui
        </Button>
        <Button onOverlay variant="secondary" onClick={() => answer(false)}>
          Non
        </Button>
        {index > 0 ? (
          <Button
            onOverlay
            variant="quiet"
            onClick={() => {
              setIndex(index - 1);
              focusHeading();
            }}
          >
            Précédent
          </Button>
        ) : null}
      </div>

      <p className="text-body-14 text-fg-2" aria-live="polite">
        Niveau avec ces réponses :{' '}
        <span className="font-semibold text-fg-1 tabular">{formatSkillLevel(result)}</span>
      </p>
    </div>
  );
}
