import { describe, expect, it } from 'vitest';
import {
  applicationXpAllowance,
  detectLevelUp,
  DAILY_APPLICATION_XP_CAP,
  getLevelInfo,
  LEVEL_TITLES,
  XP_REWARDS,
  xpToNextLevel,
} from './xp';

describe('xpToNextLevel', () => {
  it('follows the curve 50 + 150 × (n − 1)', () => {
    expect(xpToNextLevel(1)).toBe(50);
    expect(xpToNextLevel(2)).toBe(200);
    expect(xpToNextLevel(3)).toBe(350);
    expect(xpToNextLevel(4)).toBe(500);
    expect(xpToNextLevel(8)).toBe(1100);
  });
});

describe('getLevelInfo', () => {
  it('starts at level 1 "Mousse" with 0 XP', () => {
    expect(getLevelInfo(0)).toEqual({ level: 1, title: 'Mousse', xpIntoLevel: 0, xpForLevel: 50 });
  });

  it('treats negative totals as 0', () => {
    expect(getLevelInfo(-30).level).toBe(1);
    expect(getLevelInfo(-30).xpIntoLevel).toBe(0);
  });

  it('levels up exactly on the threshold', () => {
    expect(getLevelInfo(49).level).toBe(1);
    expect(getLevelInfo(50)).toEqual({
      level: 2,
      title: 'Rameur',
      xpIntoLevel: 0,
      xpForLevel: 200,
    });
    expect(getLevelInfo(249).level).toBe(2);
    expect(getLevelInfo(250).level).toBe(3);
  });

  it('turns 790 XP into level 4 "Timonier", 190 / 500', () => {
    expect(getLevelInfo(790)).toEqual({
      level: 4,
      title: 'Timonier',
      xpIntoLevel: 190,
      xpForLevel: 500,
    });
  });

  it('keeps the last title beyond level 8', () => {
    // Levels 1→9 cost 50 + 200 + … + 1100 = 4600 XP.
    const info = getLevelInfo(4600);
    expect(info.level).toBe(9);
    expect(info.title).toBe(LEVEL_TITLES[LEVEL_TITLES.length - 1]);
  });
});

describe('applicationXpAllowance', () => {
  it('grants the full reward below the cap', () => {
    expect(applicationXpAllowance(0)).toBe(XP_REWARDS.APPLICATION_SENT);
    expect(applicationXpAllowance(60)).toBe(15);
  });

  it('grants only what is left before the cap', () => {
    expect(applicationXpAllowance(70)).toBe(5);
  });

  it('grants nothing once the cap is reached', () => {
    expect(applicationXpAllowance(DAILY_APPLICATION_XP_CAP)).toBe(0);
    expect(applicationXpAllowance(120)).toBe(0);
  });

  it('caps a day at 5 applications', () => {
    let earned = 0;
    for (let i = 0; i < 8; i++) earned += applicationXpAllowance(earned);
    expect(earned).toBe(75);
  });
});

describe('detectLevelUp', () => {
  it('returns null when the level does not change', () => {
    expect(detectLevelUp(0, 40)).toBeNull();
    expect(detectLevelUp(300, 250)).toBeNull();
  });

  it('describes the new level when a threshold is crossed', () => {
    // 40 + 60 XP (course completed) crosses the 50 XP threshold.
    expect(detectLevelUp(40, 100)).toEqual({
      level: 2,
      title: 'Rameur',
      nextTitle: 'Vigie',
      xpToNext: 150,
    });
  });

  it('reports the highest level when several are crossed at once', () => {
    expect(detectLevelUp(0, 300)?.level).toBe(3);
  });
});
