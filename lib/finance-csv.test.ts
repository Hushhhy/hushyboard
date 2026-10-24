import { describe, expect, it } from 'vitest';
import {
  detectFormat,
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

// A made-up Revolut statement (fake merchants and amounts), with the structure of the real
// export: a summary block, then several tables that each end with a « Total » line.
const REVOLUT = [
  '"Comptes courants Récapitulatifs",,,,,,,,,,,',
  '"Numéro de compte (FR IBAN)","FR00TEST","Date d\'ouverture","1 janv. 2020",,,,,,,,',
  '"Solde moyen T1 2026","100,00€","Solde d\'ouverture","500,00€",,,,,,,,',
  '"Relevé des transactions",,,,,,,,,,,',
  'Date,Description,Catégorie,"Argent entrant/sortant",Solde,"Impôt retenu","Autres taxes",Frais,,,,',
  '"1 janv. 2026","Boulangerie Exemple",Commerçant,"-4,20€","495,80€","0,00€","0,00€","0,00€",,,,',
  '"15 févr. 2026","Ciné Test",Commerçant,"-12,50€","1 483,30€","0,00€","0,00€","0,00€",,,,',
  '"12 août 2026","Paiement envoyé par EMPLOYEUR TEST",Rechargez,"1 000,00€","1 495,80€","0,00€","0,00€","0,00€",,,,',
  '"9 déc. 2026","Vérification de carte",Commerçant,"0,00€","1 495,80€","0,00€","0,00€","0,00€",,,,',
  '"3 decembre 2026","Librairie Fictive",Commerçant,"-8,00€","1 487,80€","0,00€","0,00€","0,00€",,,,',
  'Total,,,"975,30€",,"0,00€","0,00€","0,00€",,,,',
  ',,,,,,,,,,,',
  '---------,,,,,,,,,,,',
  '"Abonnements (EUR)",,,,,,,,,,,',
  'Date,Description,Catégorie,"Argent entrant/sortant",Solde,"Impôt retenu","Autres taxes",Frais,,,,',
  '"7 janv. 2026","Streaming Test",Commerçant,"-9,99€","0,00€","0,00€","0,00€","0,00€",,,,',
].join('\n');

describe('Revolut statement', () => {
  it('finds the transactions header after the summary, without the empty end columns', () => {
    const table = parseCsv(REVOLUT);
    expect(table.headers).toEqual([
      'Date',
      'Description',
      'Catégorie',
      'Argent entrant/sortant',
      'Solde',
      'Impôt retenu',
      'Autres taxes',
      'Frais',
    ]);
    expect(detectFormat(table.headers)).toBe('revolut');
  });

  it('stops at the « Total » line of the first table', () => {
    const table = parseCsv(REVOLUT);
    expect(table.rows).toHaveLength(5);
    expect(table.rows.map((row) => row[1])).not.toContain('Streaming Test');
  });

  it('maps date, description and money in/out, never the balance or the 0,00 € columns', () => {
    const table = parseCsv(REVOLUT);
    expect(guessMapping(table.headers, table.rows)).toEqual({
      date: 0,
      label: 1,
      amount: 3,
      debit: null,
      credit: null,
    });
  });

  it('reads every line; a 0,00 € line is set aside, not refused', () => {
    const table = parseCsv(REVOLUT);
    const lines = mapRows(table.rows, guessMapping(table.headers, table.rows));
    expect(lines.map((line) => (line.ok ? [line.date, line.amountCents] : line.error))).toEqual([
      ['2026-01-01', -420],
      ['2026-02-15', -1250],
      ['2026-08-12', 100000],
      'montant nul',
      ['2026-12-03', -800],
    ]);
    expect(lines[3]).toMatchObject({ ok: false, ignored: true });
    expect(lines.filter((line) => !line.ok && !line.ignored)).toHaveLength(0);
  });

  it('takes the column with real amounts when the names say nothing', () => {
    const headers = ['Jour', 'Opération', 'Valeur A', 'Valeur B', 'Solde'];
    const rows = [
      ['01/10/2026', 'Café', '0,00', '-2,50', '100,00'],
      ['02/10/2026', 'Pain', '0,00', '-1,20', '98,80'],
    ];
    expect(guessMapping(headers, rows).amount).toBe(3);
  });
});

describe('parseBankDate with French month names', () => {
  it('reads short and full names, with or without dot or accent, and ignores a time', () => {
    const day = (value: string) => parseBankDate(value)?.toISOString().slice(0, 10) ?? null;
    expect(day('1 janv. 2026')).toBe('2026-01-01');
    expect(day('15 févr. 2026')).toBe('2026-02-15');
    expect(day('15 fevr 2026')).toBe('2026-02-15');
    expect(day('3 mai 2026')).toBe('2026-05-03');
    expect(day('12 août 2026')).toBe('2026-08-12');
    expect(day('12 aout 2026')).toBe('2026-08-12');
    expect(day('1 sept. 2026')).toBe('2026-09-01');
    expect(day('9 déc. 2026')).toBe('2026-12-09');
    expect(day('9 décembre 2026')).toBe('2026-12-09');
    expect(day('1er juillet 2026')).toBe('2026-07-01');
    expect(day('21 oct. 2026 14:32')).toBe('2026-10-21');
    expect(day('2026-10-21 14:32:05')).toBe('2026-10-21');
    expect(day('21/10/2026 14:32')).toBe('2026-10-21');
  });

  it('refuses unknown months and impossible days', () => {
    expect(parseBankDate('3 brumaire 2026')).toBeNull();
    expect(parseBankDate('31 févr. 2026')).toBeNull();
    expect(parseBankDate('Total')).toBeNull();
  });
});
