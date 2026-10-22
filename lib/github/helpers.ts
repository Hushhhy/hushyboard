import type { ProjectCategory } from '@/generated/prisma/client';

// Pure helpers for GitHub projects (unit-tested, no network). Safe to import from the browser.

export const PROJECT_CATEGORY_LABELS: Record<ProjectCategory, string> = {
  SCHOOL_42: 'Projet 42',
  PERSONAL: 'Perso',
  TEAM: 'Équipe',
};

export type LanguageShare = { name: string; percent: number };

// GitHub returns bytes per language: { TypeScript: 82000, CSS: 14000 } → shares in %, largest first.
export function languagesToPercent(bytes: Record<string, number>): LanguageShare[] {
  const total = Object.values(bytes).reduce((sum, value) => sum + value, 0);
  if (total <= 0) return [];
  return Object.entries(bytes)
    .map(([name, value]) => ({ name, percent: Math.round((value / total) * 1000) / 10 }))
    .filter((language) => language.percent > 0)
    .sort((a, b) => b.percent - a.percent);
}

// Projects of the 42 curriculum, recognised by name when the repo has no "42" topic.
// Written with underscores: names are compared with "-" and "_" treated the same.
export const KNOWN_42_PROJECTS = [
  'libft',
  'get_next_line',
  'ft_printf',
  'born2beroot',
  'push_swap',
  'pipex',
  'minitalk',
  'so_long',
  'fdf',
  'fract_ol',
  'fractol',
  'philosophers',
  'philo',
  'minishell',
  'cub3d',
  'minirt',
  'netpractice',
  'cpp_modules',
  'inception',
  'inception_of_things',
  'webserv',
  'ft_irc',
  'ft_transcendence',
  'transcendence',
  'python_for_data_science',
  'piscine',
];

// "42-Minishell", "cpp-modules-42" → "minishell", "cpp_modules".
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/-/g, '_').replace(/^42_?/, '').replace(/_?42$/, '');
}

// Default category, only used on first insert: Alex's choice is never overwritten afterwards.
export function guessCategory(
  name: string,
  topics: string[],
  isExternal: boolean
): ProjectCategory {
  const normalized = normalizeName(name);
  const is42 =
    topics.some((topic) =>
      ['42', '42school', '42-school', 'ecole42', '42born2code'].includes(topic)
    ) ||
    KNOWN_42_PROJECTS.some(
      (project) => normalized === project || normalized.startsWith(`${project}_`)
    );
  if (is42) return 'SCHOOL_42';
  return isExternal ? 'TEAM' : 'PERSONAL';
}

// "https://github.com/Hushhhy/ft_transcendence/tree/main", "github.com/a/b.git" or "a/b" → owner and repo.
export function parseRepoUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim().replace(/\/+$/, '');
  const match =
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:\/.*)?$/i.exec(
      trimmed
    ) ?? /^([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(trimmed);
  if (!match) return null;
  const [, owner, repo] = match;
  if (owner === '.' || owner === '..' || repo === '.' || repo === '..') return null;
  return { owner, repo };
}

// URL segment of a project page: the repo name, or "owner~repo" for someone else's repo
// (two repos with the same name never collide).
export function projectSlug(project: {
  name: string;
  fullName: string;
  isExternal: boolean;
}): string {
  return project.isExternal ? project.fullName.replace('/', '~') : project.name;
}

export function parseProjectSlug(slug: string): { name: string; fullName: string | null } {
  const decoded = decodeURIComponent(slug);
  if (decoded.includes('~')) {
    const [owner, name] = decoded.split('~');
    return { name, fullName: `${owner}/${name}` };
  }
  return { name: decoded, fullName: null };
}

// A file is shown as text unless it has a NUL byte in its first 8 kB (same rule as git).
export function isBinary(bytes: Uint8Array): boolean {
  const end = Math.min(bytes.length, 8000);
  for (let index = 0; index < end; index += 1) if (bytes[index] === 0) return true;
  return false;
}

// Language or topic → skill slug of the profile (suggested links, on first insert only).
const LANGUAGE_SKILLS: Record<string, string> = {
  typescript: 'typescript',
  javascript: 'javascript',
  html: 'html',
  css: 'css',
  scss: 'css',
  python: 'python',
  'jupyter notebook': 'pandas',
  c: 'c',
  'c++': 'cpp',
  shell: 'linux-bash',
  dockerfile: 'docker',
  php: 'php-symfony',
  twig: 'php-symfony',
  plpgsql: 'sql',
};

const TOPIC_SKILLS: Record<string, string> = {
  react: 'react',
  reactjs: 'react',
  nextjs: 'nextjs',
  'next-js': 'nextjs',
  node: 'nodejs',
  nodejs: 'nodejs',
  express: 'nodejs',
  prisma: 'prisma',
  postgresql: 'sql',
  postgres: 'sql',
  sql: 'sql',
  docker: 'docker',
  'docker-compose': 'docker',
  tailwindcss: 'tailwind',
  tailwind: 'tailwind',
  pandas: 'pandas',
  symfony: 'php-symfony',
  typescript: 'typescript',
};

export function suggestSkillSlugs(languages: LanguageShare[], topics: string[]): string[] {
  const slugs = new Set<string>();
  for (const language of languages) {
    // Tiny shares (a stray script) are not a skill used in the project.
    if (language.percent < 3) continue;
    const slug = LANGUAGE_SKILLS[language.name.toLowerCase()];
    if (slug) slugs.add(slug);
  }
  for (const topic of topics) {
    const slug = TOPIC_SKILLS[topic.toLowerCase()];
    if (slug) slugs.add(slug);
  }
  return [...slugs];
}

// Colour of a language in bars and legends: design tokens only. The name and the % are
// always written next to it, so the colour never carries the meaning alone.
const LANGUAGE_COLORS: Record<string, string> = {
  typescript: 'bg-info',
  javascript: 'bg-career',
  css: 'bg-warning',
  scss: 'bg-warning',
  html: 'bg-danger',
  python: 'bg-habits',
  'jupyter notebook': 'bg-habits',
  shell: 'bg-success',
  c: 'bg-fg-2',
  'c++': 'bg-leisure',
  php: 'bg-finance',
};
const FALLBACK_COLORS = ['bg-finance', 'bg-leisure', 'bg-success', 'bg-fg-3'];

export function languageColor(name: string, index: number): string {
  return LANGUAGE_COLORS[name.toLowerCase()] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

// Language for syntax highlighting, from the file name (falls back to plain text).
const EXTENSION_LANGUAGES: Record<string, string> = {
  ts: 'typescript',
  tsx: 'tsx',
  js: 'javascript',
  jsx: 'jsx',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  css: 'css',
  scss: 'scss',
  html: 'html',
  md: 'markdown',
  py: 'python',
  ipynb: 'json',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  hpp: 'cpp',
  cc: 'cpp',
  sh: 'shellscript',
  bash: 'shellscript',
  zsh: 'shellscript',
  yml: 'yaml',
  yaml: 'yaml',
  sql: 'sql',
  prisma: 'prisma',
  php: 'php',
  twig: 'twig',
  toml: 'toml',
  xml: 'xml',
  svg: 'xml',
  go: 'go',
  rs: 'rust',
  java: 'java',
  env: 'dotenv',
};

const FILE_NAME_LANGUAGES: Record<string, string> = {
  makefile: 'make',
  dockerfile: 'docker',
  '.gitignore': 'shellscript',
  '.dockerignore': 'shellscript',
};

export function languageForPath(path: string): string {
  const fileName = path.split('/').pop()?.toLowerCase() ?? '';
  if (FILE_NAME_LANGUAGES[fileName]) return FILE_NAME_LANGUAGES[fileName];
  if (fileName.startsWith('dockerfile')) return 'docker';
  const extension = fileName.includes('.') ? fileName.split('.').pop()! : '';
  return EXTENSION_LANGUAGES[extension] ?? 'text';
}

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|ico|avif)$/i;

export function isImagePath(path: string): boolean {
  return IMAGE_EXTENSIONS.test(path);
}
