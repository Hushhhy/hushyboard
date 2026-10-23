import Papa from 'papaparse';
import { parseEurosToCents } from './finance';

// Bank statement import (CSV). Runs in the browser: the file never leaves Alex's computer,
// only the parsed lines are sent. Pure, unit-tested. Banks differ (separator, date format,
// one signed amount column or debit/credit columns), hence the mapping step.

export type CsvTable = { headers: string[]; rows: string[][] };

export function parseCsv(text: string): CsvTable {
  const result = Papa.parse<string[]>(text.replace(/^﻿/, ''), {
    skipEmptyLines: 'greedy',
    delimitersToGuess: [';', ',', '\t', '|'],
  });
  const lines = result.data.map((row) => row.map((cell) => (cell ?? '').trim()));
  // Some banks put a few info lines before the header: start at the first line with
  // at least three cells.
  const start = lines.findIndex((row) => row.filter(Boolean).length >= 3);
  if (start === -1) return { headers: [], rows: [] };
  return { headers: lines[start], rows: lines.slice(start + 1) };
}

export type CsvMapping = {
  date: number;
  label: number;
  // Either one signed amount column, or debit and credit columns.
  amount: number | null;
  debit: number | null;
  credit: number | null;
};

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Columns guessed from their names; Alex corrects them in the mapping step.
export function guessMapping(headers: string[]): CsvMapping {
  const find = (...patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const index = headers.findIndex((header) => pattern.test(normalize(header)));
      if (index !== -1) return index;
    }
    return -1;
  };
  const date = find(/date.*(op|compta)/, /^date/, /date/);
  const label = find(/libelle/, /label/, /description/, /intitule/, /detail/);
  const amount = find(/montant/, /amount/, /somme/);
  const debit = find(/debit/);
  const credit = find(/credit/);
  return {
    date: date === -1 ? 0 : date,
    label: label === -1 ? 1 : label,
    amount: amount === -1 ? (debit === -1 ? 2 : null) : amount,
    debit: amount === -1 && debit !== -1 ? debit : null,
    credit: amount === -1 && credit !== -1 ? credit : null,
  };
}

// "15/10/2026", "15-10-26", "2026-10-15", "15.10.2026" → the day as a UTC midnight Date.
export function parseBankDate(value: string): Date | null {
  const text = value.trim();
  let year: number;
  let month: number;
  let day: number;
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const fr = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/);
  if (iso) [year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (fr) {
    [day, month, year] = [Number(fr[1]), Number(fr[2]), Number(fr[3])];
    if (year < 100) year += 2000;
  } else return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

// "−23,40", "-23.40", "1 234,56", "1,234.56", "+1 220,00 €" → cents.
export function parseBankAmount(value: string): number | null {
  let text = value
    .trim()
    .replace(/[−–]/g, '-')
    .replace(/[\s  €]/g, '');
  if (!text) return null;
  text = text.replace(/^\+/, '');
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    // The last separator is the decimal one, the other groups thousands.
    text = lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '');
  }
  return parseEurosToCents(text);
}

export type ParsedLine =
  | { line: number; ok: true; date: string; label: string; amountCents: number }
  | { line: number; ok: false; error: string };

// Rows → transactions with their line number (header = line 1), or the reason they are refused.
export function mapRows(rows: string[][], mapping: CsvMapping): ParsedLine[] {
  return rows.map((row, index) => {
    const line = index + 2;
    const date = parseBankDate(row[mapping.date] ?? '');
    if (!date) return { line, ok: false, error: `date « ${row[mapping.date] ?? ''} »` };
    const label = (row[mapping.label] ?? '').replace(/\s+/g, ' ').trim();
    if (!label) return { line, ok: false, error: 'libellé vide' };
    let amountCents: number | null;
    if (mapping.amount !== null) {
      amountCents = parseBankAmount(row[mapping.amount] ?? '');
    } else {
      const debit = parseBankAmount(row[mapping.debit ?? -1] ?? '') ?? 0;
      const credit = parseBankAmount(row[mapping.credit ?? -1] ?? '') ?? 0;
      const empty =
        !(row[mapping.debit ?? -1] ?? '').trim() && !(row[mapping.credit ?? -1] ?? '').trim();
      amountCents = empty ? null : credit - Math.abs(debit);
    }
    if (amountCents === null || amountCents === 0) {
      return { line, ok: false, error: 'montant illisible' };
    }
    return {
      line,
      ok: true,
      date: date.toISOString().slice(0, 10),
      label: label.slice(0, 200),
      amountCents,
    };
  });
}

// "CARTE X1234 15/10 CARREFOUR CITY PARIS 12" → "carrefour city paris": for duplicate checks
// and to reuse the category of a similar past transaction.
export function labelKey(label: string): string {
  return normalize(label)
    .replace(/\b(carte|cb|prlv|sepa|vir|virement|paiement|achat|x\d+)\b/g, ' ')
    .replace(/[^a-z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 4)
    .join(' ');
}

// Fingerprint of a statement line, hashed by the server into importHash. Identical lines on
// the same day (two coffees) are told apart by their rank in the file.
export function importKeys(
  lines: { date: string; label: string; amountCents: number }[]
): string[] {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const base = `${line.date}|${line.amountCents}|${labelKey(line.label) || line.label.toLowerCase()}`;
    const rank = (seen.get(base) ?? 0) + 1;
    seen.set(base, rank);
    return `${base}|${rank}`;
  });
}
