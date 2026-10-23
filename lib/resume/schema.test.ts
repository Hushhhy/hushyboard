import { describe, expect, it } from 'vitest';
import { coerceResumeContent, resumeContentSchema } from './schema';

describe('coerceResumeContent', () => {
  it('turns a sloppy AI answer into a valid CV without inventing anything', () => {
    const answer = {
      header: { fullName: 'Alexis Carpentier', title: null, email: 'a@b.c', phone: 612345678 },
      summary: 'x'.repeat(900),
      skillGroups: [
        { name: '', items: ['C', null, 'Python', ''] },
        { name: 'Vide', items: [] },
      ],
      experiences: [
        { title: '', organization: 'Restauration rapide', bullets: ['Service.', 'y'.repeat(400)] },
        { title: '', organization: '', bullets: ['Sans titre ni entreprise'] },
      ],
      projects: [{ name: 'minishell', technologies: null }, { description: 'Sans nom' }],
      education: [{ degree: null, school: 'École 42 Paris', start: 2023 }],
      languages: [{ name: 'Anglais', level: null }, { level: 'B2' }],
      interests: 'Jeux vidéo',
    };
    const result = resumeContentSchema.safeParse(coerceResumeContent(answer));
    expect(result.success).toBe(true);
    const cv = result.data!;
    expect(cv.header).toMatchObject({ title: '', phone: '612345678', linkedin: '' });
    expect(cv.summary).toHaveLength(800);
    expect(cv.skillGroups).toEqual([{ name: 'Compétences', items: ['C', 'Python'] }]);
    expect(cv.experiences).toHaveLength(1);
    expect(cv.experiences[0]).toMatchObject({ title: 'Restauration rapide', start: '' });
    expect(cv.experiences[0].bullets[1]).toHaveLength(300);
    expect(cv.projects).toEqual([
      { name: 'minishell', description: '', technologies: [], url: '' },
    ]);
    expect(cv.education[0]).toMatchObject({ degree: 'École 42 Paris', start: '2023' });
    expect(cv.languages).toEqual([{ name: 'Anglais', level: '' }]);
    expect(cv.interests).toEqual([]);
  });

  it('uses the account name only when the CV gives none', () => {
    const empty = coerceResumeContent({}, 'Alexis Carpentier') as { header: { fullName: string } };
    expect(empty.header.fullName).toBe('Alexis Carpentier');
    expect(resumeContentSchema.safeParse(coerceResumeContent(null, 'A')).success).toBe(true);
    const named = coerceResumeContent({ header: { fullName: 'Jean' } }, 'Autre') as {
      header: { fullName: string };
    };
    expect(named.header.fullName).toBe('Jean');
  });
});
