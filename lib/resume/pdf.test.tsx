import { describe, expect, it } from 'vitest';
import { renderResumePdf, resumeFileName, resumeKeywords, resumeSectionOrder } from './pdf';
import type { ResumeContent } from './schema';

const sample: ResumeContent = {
  header: {
    fullName: 'Jean Test',
    title: 'Développeur full stack',
    email: 'jean.test@example.com',
    phone: '',
    location: 'Paris',
    github: 'github.com/jeantest',
    linkedin: '',
    website: '',
  },
  summary: 'Étudiant à l’École 42, je cherche une alternance en développement full stack.',
  skillGroups: [{ name: 'Langages', items: ['TypeScript', 'C', 'SQL'] }],
  experiences: [
    {
      title: 'Stagiaire développeur',
      organization: 'Société Exemple',
      location: 'Lyon',
      start: 'janv. 2025',
      end: 'juin 2025',
      bullets: ['Création d’une API Node.js', 'Tests automatisés'],
    },
  ],
  projects: [
    {
      name: 'Transcendance',
      description: 'Plateforme web multijoueur, en équipe.',
      technologies: ['TypeScript', 'PostgreSQL'],
      url: '',
    },
  ],
  education: [
    {
      degree: 'Tronc commun 42',
      school: 'École 42 Paris',
      start: '2023',
      end: '2026',
      details: '',
    },
  ],
  languages: [{ name: 'Français', level: 'natif' }],
  interests: ['Jeux vidéo'],
};

describe('renderResumePdf', () => {
  it('renders a valid PDF with the brand fonts and French accents', async () => {
    const buffer = await renderResumePdf(sample, 'CV Jean Test');
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(5_000);
    // Embedded font subsets keep their PostScript names.
    const text = buffer.toString('latin1');
    expect(text).toContain('IBMPlexSans');
    expect(text).toContain('BricolageGrotesque');
  }, 30_000);
});

describe('resumeFileName', () => {
  it('builds an ASCII file name', () => {
    expect(resumeFileName('Alexis Carpentier')).toBe('CV-Alexis-Carpentier.pdf');
    expect(resumeFileName('Élodie Ñúñez', 'Groupe Bel')).toBe('CV-Elodie-Nunez-Groupe-Bel.pdf');
    expect(resumeFileName('')).toBe('CV-Hushyboard.pdf');
  });
});

describe('ATS layout', () => {
  it('prints standard sections in reading order, skipping empty ones', () => {
    expect(resumeSectionOrder(sample)).toEqual([
      'summary',
      'skills',
      'projects',
      'experiences',
      'education',
      'languages',
      'interests',
    ]);
    expect(resumeSectionOrder({ ...sample, summary: '', interests: [], projects: [] })).toEqual([
      'skills',
      'experiences',
      'education',
      'languages',
    ]);
  });

  it('lists every skill and technology once as PDF keywords', () => {
    expect(
      resumeKeywords({
        ...sample,
        skillGroups: [{ name: 'Web', items: ['TypeScript', 'React (en cours d’apprentissage)'] }],
      })
    ).toBe('TypeScript, React, PostgreSQL');
  });
});
