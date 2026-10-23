import { describe, expect, it } from 'vitest';
import {
  currentGame,
  describeGames,
  formatPlayTime,
  franchises,
  gameStatusLabel,
  gameStatusOptions,
  nextInFranchise,
  parsePlayTime,
  standaloneOrder,
  storyOrder,
  upNext,
  type GameLite,
} from './games';

const game = (overrides: Partial<GameLite>): GameLite => ({
  id: overrides.title ?? 'x',
  title: 'Jeu',
  franchise: "Assassin's Creed",
  storyOrder: null,
  status: 'NOT_STARTED',
  updatedAt: new Date('2026-10-01'),
  ...overrides,
});

const ac = [
  game({ title: 'Odyssey', storyOrder: 1, status: 'FINISHED' }),
  game({ title: 'Valhalla', storyOrder: 4, status: 'DROPPED' }),
  game({
    title: 'Black Flag',
    storyOrder: 8,
    status: 'PLAYING',
    updatedAt: new Date('2026-10-20'),
  }),
  game({ title: 'Unity', storyOrder: 11 }),
  game({ title: 'Rogue', storyOrder: 9 }),
  game({ title: 'Mass Effect', franchise: 'Mass Effect', storyOrder: 1 }),
  game({ title: 'Hades', franchise: null }),
];

describe('franchises', () => {
  it('counts games per franchise, the ones without franchise last', () => {
    expect(franchises(ac)).toEqual([
      { name: "Assassin's Creed", count: 5 },
      { name: 'Mass Effect', count: 1 },
      { name: 'Sans franchise', count: 1 },
    ]);
  });
});

describe('storyOrder and nextInFranchise', () => {
  it('sorts by story order, games without position last', () => {
    const titles = storyOrder([...ac, game({ title: 'Mirage' })]).map((item) => item.title);
    expect(titles.slice(0, 5)).toEqual([
      'Mass Effect',
      'Odyssey',
      'Valhalla',
      'Black Flag',
      'Rogue',
    ]);
    expect(titles.at(-1)).toBe('Mirage');
  });

  it('picks the next unplayed game of the same franchise after the current one', () => {
    const current = currentGame(ac);
    expect(current?.title).toBe('Black Flag');
    expect(nextInFranchise(ac, current)?.title).toBe('Rogue');
    expect(nextInFranchise(ac, ac[6])).toBeNull();
  });
});

describe('play time', () => {
  it('formats minutes', () => {
    expect(formatPlayTime(null)).toBe('—');
    expect(formatPlayTime(45)).toBe('45 min');
    expect(formatPlayTime(1320)).toBe('22 h');
    expect(formatPlayTime(1350)).toBe('22 h 30');
  });

  it('reads hours and minutes as typed', () => {
    expect(parsePlayTime('1 h 30')).toBe(90);
    expect(parsePlayTime('2h')).toBe(120);
    expect(parsePlayTime('1,5')).toBe(90);
    expect(parsePlayTime('45 min')).toBe(45);
    expect(parsePlayTime('3')).toBe(180);
    expect(parsePlayTime('')).toBeNull();
    expect(parsePlayTime('beaucoup')).toBeNull();
  });
});

describe('describeGames', () => {
  it('names the game being played', () => {
    expect(describeGames({ title: 'Black Flag' }, 7)).toBe('En cours : Black Flag.');
    expect(describeGames(null, 3)).toBe('3 jeux, aucun en cours.');
    expect(describeGames(null, 0)).toBe('Aucun jeu pour l’instant.');
  });
});

describe('upNext', () => {
  it('suggests the first game not started after the last one finished', () => {
    const finished = ac.map((item) =>
      item.title === 'Black Flag' ? { ...item, status: 'FINISHED' as const } : item
    );
    const assassins = finished.filter((item) => item.franchise === "Assassin's Creed");
    expect(upNext(assassins)?.title).toBe('Rogue');
    expect(upNext([game({ title: 'Solo' })])?.title).toBe('Solo');
    expect(upNext([game({ title: 'Done', status: 'FINISHED' })])).toBeNull();
  });
});

describe('endless games', () => {
  it('never offers « Terminé » for an endless game, and calls a drop « Arrêté »', () => {
    expect(gameStatusOptions(true)).not.toContain('FINISHED');
    expect(gameStatusOptions(false)).toContain('FINISHED');
    expect(gameStatusLabel('DROPPED', true)).toBe('Arrêté');
    expect(gameStatusLabel('DROPPED', false)).toBe('Abandonné');
  });
});

describe('standaloneOrder', () => {
  it('puts the game being played first, then paused, to start, finished, dropped', () => {
    const standalone = [
      game({ title: 'Zelda', franchise: null, status: 'FINISHED' }),
      game({ title: 'Wow', franchise: null, status: 'PLAYING', endless: true }),
      game({ title: 'Celeste', franchise: null }),
      game({ title: 'Hades', franchise: null, status: 'PAUSED' }),
      game({ title: 'Apex', franchise: null }),
    ];
    expect(standaloneOrder(standalone).map((item) => item.title)).toEqual([
      'Wow',
      'Hades',
      'Apex',
      'Celeste',
      'Zelda',
    ]);
  });
});
