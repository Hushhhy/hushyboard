import { describe, expect, it } from 'vitest';
import { isLabelTone, NEW_LABEL_COLORS, nearestTone } from './labels';

describe('nearestTone', () => {
  it('maps every colour offered for a new label back to its own tone', () => {
    for (const color of NEW_LABEL_COLORS) {
      expect(nearestTone(color.gmail.backgroundColor)).toBe(color.tone);
    }
  });

  it('maps other Gmail colours to the closest token, greys to neutral', () => {
    expect(nearestTone('#285bac')).toBe('info');
    expect(nearestTone('#43d692')).toBe('habits');
    expect(nearestTone('#cc3a21')).toBe('danger');
    expect(nearestTone('#999999')).toBe('neutral');
    expect(nearestTone('#000000')).toBe('neutral');
    expect(nearestTone(undefined)).toBe('neutral');
    expect(nearestTone('red')).toBe('neutral');
  });
});

describe('isLabelTone', () => {
  it('accepts only the tones offered in the dialog', () => {
    expect(isLabelTone('career')).toBe(true);
    expect(isLabelTone('neutral')).toBe(false);
    expect(isLabelTone('#fff')).toBe(false);
  });
});
