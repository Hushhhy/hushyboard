import Link from 'next/link';
import type { CourseItemKind } from '@/generated/prisma/client';
import { CheckIcon } from '@/components/icons';
import { Tag, type ChipTone } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { COURSE_ITEM_LABELS, itemPath } from '@/lib/course-progress';
import { getCourseCounts, getNotesIndex } from '@/lib/learning-data';
import { requireUser } from '@/lib/session';
import { CoursesHeader } from './courses-view';

const KIND_TONES: Record<CourseItemKind, ChipTone | undefined> = {
  PART: undefined,
  QUIZ: 'info',
  SOLO_PROJECT: 'career',
};

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`;

// "Notes" tab: a table of contents of every course, module and part, with its notes.
// Each part opens its own page, where its notes are read and written.
export async function NotesView() {
  const user = await requireUser();
  const [courses, counts] = await Promise.all([getNotesIndex(user.id), getCourseCounts(user.id)]);

  return (
    <>
      <CoursesHeader counts={counts} basePath="/career/courses" />
      {courses.length === 0 ? (
        <EmptyState
          variant="block"
          title="Aucun cours pour l'instant."
          description="Ajoute un cours et son plan : chaque partie aura sa page de notes."
          action={{ label: 'Voir les cours', href: '/career/courses' }}
        />
      ) : (
        courses.map((course) => {
          const noteTotal =
            course._count.notes +
            course.modules.reduce(
              (sum, courseModule) =>
                sum + courseModule.items.reduce((count, item) => count + item.notes.length, 0),
              0
            );
          return (
            <section
              key={course.id}
              aria-labelledby={`toc-${course.id}`}
              className="flex flex-col gap-3 rounded-card bg-surface-default p-4"
            >
              <div className="flex items-baseline gap-2">
                <h2 id={`toc-${course.id}`} className="flex-1 text-title-18">
                  <Link href={`/career/courses/${course.id}`} className="hover:underline">
                    {course.title}
                  </Link>
                </h2>
                <span className="text-caption-12 text-fg-3 tabular">
                  {plural(noteTotal, 'note')}
                </span>
              </div>

              <Link
                href={`/career/courses/${course.id}#notes-title`}
                className="self-start text-body-14 text-fg-2 hover:text-fg-1 hover:underline"
              >
                Notes générales · {course._count.notes}
              </Link>

              {course.modules.length === 0 ? (
                <p className="text-caption-12 text-fg-3">
                  Pas encore de plan.{' '}
                  <Link href={`/career/courses/${course.id}?edit=1`} className="underline">
                    Ajoute ses modules
                  </Link>{' '}
                  pour écrire des notes par partie.
                </p>
              ) : (
                <ol className="flex flex-col gap-3">
                  {course.modules.map((courseModule, moduleIndex) => (
                    <li key={courseModule.id} className="flex flex-col gap-1">
                      <h3 className="text-label-12 text-fg-3 uppercase">
                        Module {moduleIndex + 1} · {courseModule.title}
                      </h3>
                      {courseModule.items.length === 0 ? (
                        <p className="px-2 text-caption-12 text-fg-3">Module vide.</p>
                      ) : null}
                      <ul className="flex flex-col">
                        {courseModule.items.map((item) => {
                          const tone = KIND_TONES[item.kind];
                          return (
                            <li key={item.id} className="flex flex-col">
                              <Link
                                href={itemPath(course.id, item.id)}
                                className="flex min-h-9 items-center gap-2 rounded-control px-2 hover:bg-surface-raised"
                              >
                                <span className="grid size-4 shrink-0 place-items-center text-success">
                                  {item.completedAt ? (
                                    <>
                                      <CheckIcon className="size-4" />
                                      <span className="sr-only">Fait : </span>
                                    </>
                                  ) : null}
                                </span>
                                {tone ? (
                                  <Tag tone={tone}>{COURSE_ITEM_LABELS[item.kind]}</Tag>
                                ) : null}
                                <span className="min-w-0 flex-1 text-body-14 font-medium">
                                  {item.title}
                                </span>
                                <span
                                  className={`text-caption-12 tabular ${item.notes.length > 0 ? 'text-fg-1' : 'text-fg-3'}`}
                                >
                                  {plural(item.notes.length, 'note')}
                                </span>
                              </Link>
                              {item.notes.length > 0 ? (
                                <ul className="mb-1 ml-8 flex flex-col">
                                  {item.notes.map((note) => (
                                    <li key={note.id}>
                                      <Link
                                        href={`${itemPath(course.id, item.id)}#note-${note.id}`}
                                        className="text-caption-12 text-fg-2 hover:text-fg-1 hover:underline"
                                      >
                                        {note.title}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          );
        })
      )}
    </>
  );
}
