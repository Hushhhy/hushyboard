import { describe, expect, it } from 'vitest';
import { renderToBuffer } from '@react-pdf/renderer';
import {
  countPdfPages,
  joinDistinct,
  renderResumePdf,
  ResumeDocument,
  resumeFileName,
  resumeKeywords,
  resumeSectionOrder,
} from './pdf';
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

// As long as a real junior CV: 9 skill groups, 2 detailed projects, 2 jobs, 2 schools.
const dense: ResumeContent = {
  ...sample,
  header: { ...sample.header, linkedin: 'linkedin.com/in/jean-test-0000', phone: '06 00 00 00 00' },
  summary:
    'Développeur ayant validé le tronc commun à 42 Paris, je recherche une opportunité en développement web full stack. Autonome, j’apprends vite de nouvelles technologies grâce à une pédagogie orientée projets.',
  skillGroups: [
    'Stack principale',
    'Front-end',
    'Back-end',
    'Data science',
    'Infra et data',
    'Outils',
    'Bureautique',
    'Langages',
    'Méthodes',
  ].map((name) => ({ name, items: ['TypeScript', 'React', 'PostgreSQL', 'Docker', 'Git'] })),
  projects: [0, 1].map((index) => ({
    name: `Projet ${index + 1}`,
    description: 'Conception et développement d’une application web en équipe. '.repeat(9),
    technologies: ['TypeScript', 'React', 'Express', 'PostgreSQL', 'Docker'],
    url: '',
  })),
  experiences: [0, 1].map((index) => ({
    title: `Poste ${index + 1}`,
    organization: 'Entreprise Exemple',
    location: 'Paris',
    start: 'janvier 2025',
    end: 'mars 2026',
    bullets: [
      'Accueil et service des clients dans un environnement à fort flux.'.repeat(2),
      'Travail en équipe.',
      'Tenue de caisse.',
    ],
  })),
  education: [0, 1].map((index) => ({
    degree: `École ${index + 1}`,
    school: 'Paris',
    start: '2022',
    end: '2023',
    details: 'Paris, Île-de-France',
  })),
  languages: [
    { name: 'Français', level: 'natif' },
    { name: 'Anglais', level: 'B2' },
    { name: 'Espagnol', level: 'A2' },
  ],
};

describe('one-page CV', () => {
  it('prints a dense junior CV on one page, tighter than normal', async () => {
    const normal = await renderToBuffer(<ResumeDocument content={dense} title="CV" density={1} />);
    expect(countPdfPages(normal)).toBeGreaterThan(1);
    const fitted = await renderResumePdf(dense, 'CV');
    expect(countPdfPages(fitted)).toBe(1);
  }, 60_000);

  it('keeps the normal size when it already fits', async () => {
    expect(countPdfPages(await renderResumePdf(sample, 'CV'))).toBe(1);
  }, 30_000);
});

describe('joinDistinct', () => {
  it('prints a repeated name once', () => {
    expect(joinDistinct('École 42', 'École 42')).toBe('École 42');
    expect(joinDistinct('Game Master', 'You Have Sixty Minutes')).toBe(
      'Game Master – You Have Sixty Minutes'
    );
    expect(joinDistinct('Tronc commun', '')).toBe('Tronc commun');
  });
});
