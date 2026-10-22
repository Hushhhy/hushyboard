import { describe, expect, it } from 'vitest';
import { guardAdaptedResume, LEARNING_SUFFIX } from './adapt';
import { EMPTY_RESUME, type ResumeContent } from './schema';

const base: ResumeContent = {
  ...EMPTY_RESUME,
  header: {
    ...EMPTY_RESUME.header,
    fullName: 'Alexis Carpentier',
    title: 'Étudiant',
    email: 'a@b.c',
  },
  summary: 'Étudiant à 42.',
  skillGroups: [
    { name: 'Langages', items: ['C', 'Python', 'SQL'] },
    { name: 'Web', items: ['HTML', 'CSS'] },
  ],
  experiences: [
    {
      title: 'Équipier',
      organization: 'McDonald’s',
      location: 'Paris',
      start: 'juin 2022',
      end: 'août 2022',
      bullets: ['Service en salle.'],
    },
  ],
  projects: [
    {
      name: 'Transcendance',
      description: 'Plateforme web multijoueur.',
      technologies: ['TypeScript', 'PostgreSQL'],
      url: 'https://github.com/x/t',
    },
    { name: 'minishell', description: 'Shell en C.', technologies: ['C'], url: '' },
  ],
  education: [
    { degree: 'Tronc commun', school: 'École 42 Paris', start: '2023', end: '2026', details: '' },
  ],
  languages: [{ name: 'Anglais', level: 'B2' }],
};

const skills = { known: ['Git', 'JavaScript'], learning: ['React'] };

describe('guardAdaptedResume', () => {
  it('keeps rewrites and order, but restores every fact from the base CV', () => {
    const adapted: ResumeContent = {
      ...base,
      header: { ...base.header, title: 'Développeur full stack junior', email: 'invented@x.y' },
      summary: 'Développeur en formation à 42.',
      experiences: [
        { ...base.experiences[0], start: '2019', bullets: ['Travail en équipe sous pression.'] },
        { title: 'CTO', organization: 'Invented', location: '', start: '', end: '', bullets: [] },
      ],
      projects: [
        { ...base.projects[0], technologies: ['PostgreSQL', 'Kubernetes'], url: 'https://evil' },
      ],
      education: [{ degree: 'Master', school: 'X', start: '', end: '', details: '' }],
    };
    const result = guardAdaptedResume(base, adapted, skills);

    expect(result.header).toEqual({ ...base.header, title: 'Développeur full stack junior' });
    expect(result.summary).toBe('Développeur en formation à 42.');
    expect(result.experiences).toEqual([
      { ...base.experiences[0], bullets: ['Travail en équipe sous pression.'] },
    ]);
    expect(result.projects.map((project) => project.name)).toEqual(['Transcendance', 'minishell']);
    expect(result.projects[0].technologies).toEqual(['PostgreSQL', 'TypeScript']);
    expect(result.projects[0].url).toBe('https://github.com/x/t');
    expect(result.education).toEqual(base.education);
  });

  it('allows only real skills, and marks started ones as being learned', () => {
    const adapted: ResumeContent = {
      ...base,
      skillGroups: [
        { name: 'Front', items: ['HTML', 'CSS', 'React', 'JavaScript', 'Vue.js'] },
        { name: 'Back', items: ['SQL', 'Kafka'] },
      ],
    };
    const result = guardAdaptedResume(base, adapted, skills);
    expect(result.skillGroups).toEqual([
      { name: 'Front', items: ['HTML', 'CSS', `React${LEARNING_SUFFIX}`, 'JavaScript'] },
      { name: 'Back', items: ['SQL'] },
      { name: 'Autres compétences', items: ['C', 'Python'] },
    ]);
  });

  it('does not double the learning mention', () => {
    const adapted: ResumeContent = {
      ...base,
      skillGroups: [
        { name: 'Web', items: [`React${LEARNING_SUFFIX}`, 'C', 'Python', 'SQL', 'HTML', 'CSS'] },
      ],
    };
    expect(guardAdaptedResume(base, adapted, skills).skillGroups[0].items[0]).toBe(
      `React${LEARNING_SUFFIX}`
    );
  });
});
