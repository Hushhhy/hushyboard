import { describe, expect, it } from 'vitest';
import {
  guessCategory,
  isBinary,
  languageForPath,
  languagesToPercent,
  parseProjectSlug,
  parseRepoUrl,
  projectSlug,
  suggestSkillSlugs,
} from './helpers';

describe('languagesToPercent', () => {
  it('converts bytes to shares, largest first, one decimal', () => {
    expect(languagesToPercent({ CSS: 14_000, TypeScript: 82_000, JavaScript: 4_000 })).toEqual([
      { name: 'TypeScript', percent: 82 },
      { name: 'CSS', percent: 14 },
      { name: 'JavaScript', percent: 4 },
    ]);
    expect(languagesToPercent({ C: 2, Shell: 1 })).toEqual([
      { name: 'C', percent: 66.7 },
      { name: 'Shell', percent: 33.3 },
    ]);
  });

  it('drops negligible languages and handles empty repos', () => {
    expect(languagesToPercent({ C: 1_000_000, Makefile: 1 })).toEqual([
      { name: 'C', percent: 100 },
    ]);
    expect(languagesToPercent({})).toEqual([]);
  });
});

describe('guessCategory', () => {
  it('recognises the 42 topic and known 42 projects', () => {
    expect(guessCategory('my-shell', ['42'], false)).toBe('SCHOOL_42');
    expect(guessCategory('minishell', [], false)).toBe('SCHOOL_42');
    expect(guessCategory('42-libft', [], false)).toBe('SCHOOL_42');
    expect(guessCategory('ft_transcendence', [], true)).toBe('SCHOOL_42');
    expect(guessCategory('cpp-modules', [], false)).toBe('SCHOOL_42');
    expect(guessCategory('inception_of_things', [], false)).toBe('SCHOOL_42');
    expect(guessCategory('Piscine-Python-for-Data-Science', [], false)).toBe('SCHOOL_42');
    expect(guessCategory('minishell-42', [], false)).toBe('SCHOOL_42');
  });

  it('defaults to personal, or team for someone else’s repo', () => {
    expect(guessCategory('hushyboard', ['nextjs'], false)).toBe('PERSONAL');
    expect(guessCategory('casino', [], true)).toBe('TEAM');
  });
});

describe('parseRepoUrl', () => {
  it('reads GitHub URLs in their usual forms', () => {
    for (const input of [
      'https://github.com/teammate/ft_transcendence',
      'https://github.com/teammate/ft_transcendence/',
      'https://www.github.com/teammate/ft_transcendence.git',
      'github.com/teammate/ft_transcendence/tree/main/backend',
      'teammate/ft_transcendence',
    ]) {
      expect(parseRepoUrl(input), input).toEqual({ owner: 'teammate', repo: 'ft_transcendence' });
    }
  });

  it('refuses anything else', () => {
    for (const input of [
      '',
      'https://gitlab.com/a/b',
      'https://github.com/only-owner',
      'a b/c',
      '../x',
    ]) {
      expect(parseRepoUrl(input), input).toBeNull();
    }
  });
});

describe('project slugs', () => {
  it('uses the name for own repos and owner~name for others', () => {
    expect(
      projectSlug({ name: 'hushyboard', fullName: 'Hushhhy/hushyboard', isExternal: false })
    ).toBe('hushyboard');
    expect(
      projectSlug({ name: 'ft_transcendence', fullName: 'mate/ft_transcendence', isExternal: true })
    ).toBe('mate~ft_transcendence');
  });

  it('parses both forms back', () => {
    expect(parseProjectSlug('hushyboard')).toEqual({ name: 'hushyboard', fullName: null });
    expect(parseProjectSlug('mate~ft_transcendence')).toEqual({
      name: 'ft_transcendence',
      fullName: 'mate/ft_transcendence',
    });
    expect(parseProjectSlug('mate%7Eft_transcendence').fullName).toBe('mate/ft_transcendence');
  });
});

describe('isBinary', () => {
  it('detects a NUL byte in the first 8 kB only', () => {
    expect(isBinary(new TextEncoder().encode('const a = 1;\n'))).toBe(false);
    expect(isBinary(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01]))).toBe(true);
    const late = new Uint8Array(9000).fill(65);
    late[8500] = 0;
    expect(isBinary(late)).toBe(false);
  });
});

describe('suggestSkillSlugs', () => {
  it('maps languages and topics to profile skills', () => {
    expect(
      suggestSkillSlugs(
        [
          { name: 'TypeScript', percent: 71 },
          { name: 'Dockerfile', percent: 5 },
          { name: 'CSS', percent: 2 },
        ],
        ['nextjs', 'postgresql', 'unknown-topic']
      ).sort()
    ).toEqual(['docker', 'nextjs', 'sql', 'typescript']);
  });
});

describe('languageForPath', () => {
  it('picks the highlighting language from the file name', () => {
    expect(languageForPath('backend/src/game/table.ts')).toBe('typescript');
    expect(languageForPath('src/app.TSX')).toBe('tsx');
    expect(languageForPath('Makefile')).toBe('make');
    expect(languageForPath('docker/Dockerfile.dev')).toBe('docker');
    expect(languageForPath('LICENSE')).toBe('text');
    expect(languageForPath('minishell/src/exec.c')).toBe('c');
  });
});
