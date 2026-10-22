import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { formatShortDate } from '@/lib/dates';
import { getCourseCounts, getCourseNotes } from '@/lib/learning-data';
import { requireUser } from '@/lib/session';
import { CoursesHeader } from './courses-view';

// "Notes" tab: every note, grouped by course.
export async function NotesView() {
  const user = await requireUser();
  const [notes, counts] = await Promise.all([getCourseNotes(user.id), getCourseCounts(user.id)]);

  const byCourse = new Map<string, { title: string; completed: boolean; notes: typeof notes }>();
  for (const note of notes) {
    const group = byCourse.get(note.course.id) ?? {
      title: note.course.title,
      completed: note.course.status === 'COMPLETED',
      notes: [],
    };
    group.notes.push(note);
    byCourse.set(note.course.id, group);
  }

  return (
    <>
      <CoursesHeader counts={counts} basePath="/career/courses" />
      {byCourse.size === 0 ? (
        <EmptyState
          variant="block"
          title="Aucune note pour l'instant."
          description="Ouvre un cours puis « Notes » pour garder l'essentiel de ce que tu apprends."
          action={{ label: 'Voir les cours en cours', href: '/career/courses' }}
        />
      ) : (
        [...byCourse.entries()].map(([courseId, group]) => (
          <section
            key={courseId}
            aria-labelledby={`notes-${courseId}`}
            className="flex flex-col gap-2 rounded-card bg-surface-default p-4"
          >
            <h2 id={`notes-${courseId}`} className="text-label-12 text-fg-3 uppercase">
              Notes · {group.title}
            </h2>
            <ul className="flex flex-col divide-y divide-line-subtle">
              {group.notes.map((note) => (
                <li key={note.id} className="flex flex-col gap-1 py-3">
                  <div className="flex items-baseline gap-2">
                    <h3 className="flex-1 font-semibold">{note.title}</h3>
                    <span className="text-caption-12 text-fg-3">
                      {formatShortDate(note.createdAt)}
                    </span>
                  </div>
                  <p className="text-body-14 whitespace-pre-line text-fg-2">{note.content}</p>
                </li>
              ))}
            </ul>
            <Link
              href={`/career/courses${group.completed ? '/completed' : ''}?panel=notes-${courseId}`}
              className="self-start text-body-14 font-semibold text-fg-2 hover:text-fg-1 hover:underline"
            >
              Ajouter une note
            </Link>
          </section>
        ))
      )}
    </>
  );
}
