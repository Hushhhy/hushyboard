import { describe, expect, it } from 'vitest';
import {
  guessMapping,
  importKeys,
  labelKey,
  mapRows,
  parseBankAmount,
  parseBankDate,
  parseCsv,
} from './finance-csv';

const STATEMENT = `﻿Compte courant n° 0000;;;
Date opération;Libellé;Montant (EUR);Solde
15/10/2026;CARTE X1234 15/10 CARREFOUR CITY PARIS;-23,40;1 200,00
14/10/2026;NAVIGO OCT;−86,40;1 223,40
08/10/2026;VIR SALAIRE ALTERNANCE;+1 220,00;1 309,80
32/10/2026;PAYPAL *STEAM;-19,99;89,80
`;

describe('parseCsv', () => {
  it('guesses the separator, drops the BOM and the lines before the header', () => {
    const table = parseCsv(STATEMENT);
    expect(table.headers).toEqual(['Date opération', 'Libellé', 'Montant (EUR)', 'Solde']);
    expect(table.rows).toHaveLength(4);
    expect(parseCsv('date,label,amount\n2026-10-01,Café,"-2,50"').rows[0]).toEqual([
      '2026-10-01',
      'Café',
      '-2,50',
    ]);
  });
});

describe('guessMapping', () => {
  it('finds date, label and amount columns by name', () => {
    expect(guessMapping(['Date opération', 'Libellé', 'Montant (EUR)', 'Solde'])).toEqual({
      date: 0,
      label: 1,
      amount: 2,
      debit: null,
      credit: null,
    });
  });

  it('uses debit and credit columns when there is no amount', () => {
    expect(guessMapping(['Date', 'Date valeur', 'Libellé', 'Débit', 'Crédit'])).toEqual({
      date: 0,
      label: 2,
      amount: null,
      debit: 3,
      credit: 4,
    });
  });
});

describe('parseBankDate and parseBankAmount', () => {
  it('reads French and ISO dates, and refuses impossible ones', () => {
    expect(parseBankDate('15/10/2026')?.toISOString()).toBe('2026-10-15T00:00:00.000Z');
    expect(parseBankDate('5-1-26')?.toISOString()).toBe('2026-01-05T00:00:00.000Z');
    expect(parseBankDate('2026-10-15')?.toISOString()).toBe('2026-10-15T00:00:00.000Z');
    expect(parseBankDate('32/10/2026')).toBeNull();
    expect(parseBankDate('29/02/2026')).toBeNull();
  });

  it('reads amounts with any decimal separator and sign', () => {
    expect(parseBankAmount('-23,40')).toBe(-2340);
    expect(parseBankAmount('−86,40')).toBe(-8640);
    expect(parseBankAmount('+1 220,00 €')).toBe(122000);
    expect(parseBankAmount('1,234.56')).toBe(123456);
    expect(parseBankAmount('1.234,56')).toBe(123456);
    expect(parseBankAmount('abc')).toBeNull();
  });
});

describe('mapRows', () => {
  it('turns rows into transactions and explains refused lines', () => {
    const table = parseCsv(STATEMENT);
    const lines = mapRows(table.rows, guessMapping(table.headers));
    expect(lines[0]).toEqual({
      line: 2,
      ok: true,
      date: '2026-10-15',
      label: 'CARTE X1234 15/10 CARREFOUR CITY PARIS',
      amountCents: -2340,
    });
    expect(lines[2]).toMatchObject({ ok: true, amountCents: 122000 });
    expect(lines[3]).toEqual({ line: 5, ok: false, error: 'date « 32/10/2026 »' });
  });

  it('combines debit and credit columns', () => {
    const lines = mapRows(
      [
        ['01/10/2026', 'Loyer', '520,00', ''],
        ['03/10/2026', 'CAF', '', '280,00'],
        ['04/10/2026', 'Vide', '', ''],
      ],
      { date: 0, label: 1, amount: null, debit: 2, credit: 3 }
    );
    expect(lines.map((line) => (line.ok ? line.amountCents : line.error))).toEqual([
      -52000,
      28000,
      'montant illisible',
    ]);
  });
});

describe('labelKey and importKeys', () => {
  it('keeps the merchant words of a bank label', () => {
    expect(labelKey('CARTE X1234 15/10 CARREFOUR CITY PARIS 12')).toBe('carrefour city paris');
    expect(labelKey('PRLV SEPA Spotify AB')).toBe('spotify ab');
  });

  it('tells identical lines of the same day apart, the same way on every import', () => {
    const lines = [
      { date: '2026-10-15', label: 'CAFE', amountCents: -250 },
      { date: '2026-10-15', label: 'CAFE', amountCents: -250 },
    ];
    const keys = importKeys(lines);
    expect(keys[0]).not.toBe(keys[1]);
    expect(importKeys(lines)).toEqual(keys);
  });
});
