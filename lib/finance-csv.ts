import Papa from 'papaparse';
import { parseEurosToCents } from './finance';

// Bank statement import (CSV). Runs in the browser: the file never leaves Alex's computer,
// only the parsed lines are sent. Pure, unit-tested. Banks differ (separator, date format,
// one signed amount column or debit/credit columns, info lines and several tables in one
// file, like the Revolut statement), hence the detection and the mapping step.

export type CsvTable = { headers: string[]; rows: string[][] };

const normalize = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Header names of an amount column (signed, or money in / out).
const AMOUNT_HEADER =
  /montant|amount|somme|argent entrant|entrant\/sortant|entree.*sortie|debit|credit/;
// Columns that hold money but are never the transaction amount.
const NOT_AMOUNT_HEADER = /solde|balance|impot|tax|frais|fee|commission|retenu/;

// A transactions header: a date column and an amount column (an account summary line such
// as « Numéro de compte … Date d'ouverture » has a date but no amount).
function isTransactionsHeader(row: string[]): boolean {
  const cells = row.map(normalize).filter(Boolean);
  return (
    cells.length >= 3 &&
    cells.some((cell) => /date/.test(cell)) &&
    cells.some((cell) => AMOUNT_HEADER.test(cell) && !NOT_AMOUNT_HEADER.test(cell))
  );
}

// End of a table: its « Total » line or a separator (« --------- »).
const isTableEnd = (row: string[]) => /^(total\b|-{3,})/.test(normalize(row[0] ?? ''));

export function parseCsv(text: string): CsvTable {
  const result = Papa.parse<string[]>(text.replace(/^﻿/, ''), {
    skipEmptyLines: 'greedy',
    delimitersToGuess: [';', ',', '\t', '|'],
  });
  const lines = result.data.map((row) => row.map((cell) => (cell ?? '').trim()));
  // The first transactions header; otherwise the first line with at least three cells (some
  // banks put a few info lines before a header with unusual names).
  let start = lines.findIndex(isTransactionsHeader);
  if (start === -1) start = lines.findIndex((row) => row.filter(Boolean).length >= 3);
  if (start === -1) return { headers: [], rows: [] };
  const headers = [...lines[start]];
  // Empty columns at the end of the line (",,,,") are not columns.
  while (headers.length > 0 && !headers[headers.length - 1]) headers.pop();
  const rows: string[][] = [];
  for (const row of lines.slice(start + 1)) {
    if (isTableEnd(row)) break;
    rows.push(row.slice(0, headers.length));
  }
  return { headers, rows };
}

// Known export formats, from the header line (shown in the mapping step).
export type CsvFormat = 'revolut' | null;

export function detectFormat(headers: string[]): CsvFormat {
  const names = headers.map(normalize);
  const has = (pattern: RegExp) => names.some((name) => pattern.test(name));
  // Revolut in French (« Argent entrant/sortant ») or in English (« Started Date », « State »).
  if (has(/^date$/) && has(/argent entrant\/sortant/) && has(/^solde$/)) return 'revolut';
  if (has(/^started date$/) && has(/^amount$/) && has(/^state$/)) return 'revolut';
  return null;
}

export type CsvMapping = {
  date: number;
  label: number;
  // Either one signed amount column, or debit and credit columns.
  amount: number | null;
  debit: number | null;
  credit: number | null;
};

// Number of rows whose cell in this column is a non-zero amount.
function amountHits(rows: string[][], column: number): number {
  return rows.filter((row) => {
    const cents = parseBankAmount(row[column] ?? '');
    return cents !== null && cents !== 0;
  }).length;
}

// Columns guessed from their names, then checked against the rows when they are given:
// a balance column, or one that is always 0,00 €, is never taken as the amount.
// Alex corrects the result in the mapping step.
export function guessMapping(headers: string[], rows: string[][] = []): CsvMapping {
  const names = headers.map(normalize);
  const find = (...patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const index = names.findIndex((name) => pattern.test(name) && !NOT_AMOUNT_HEADER.test(name));
      if (index !== -1) return index;
    }
    return -1;
  };
  const date = find(/date.*(op|compta)/, /^date/, /date/);
  const label = find(/libelle/, /label/, /description/, /intitule/, /detail/);
  let amount = find(/montant/, /amount/, /argent entrant|entrant\/sortant|entree.*sortie/, /somme/);
  const debit = find(/debit/);
  const credit = find(/credit/);

  if (rows.length > 0 && (amount === -1 || amountHits(rows, amount) === 0) && debit === -1) {
    // No usable name: the column with the most non-zero amounts, outside date, label and the
    // columns that are never an amount.
    let best = -1;
    let bestHits = 0;
    names.forEach((name, index) => {
      if (index === date || index === label || NOT_AMOUNT_HEADER.test(name)) return;
      const hits = amountHits(rows, index);
      if (hits > bestHits) [best, bestHits] = [index, hits];
    });
    if (best !== -1) amount = best;
  }

  return {
    date: date === -1 ? 0 : date,
    label: label === -1 ? 1 : label,
    amount: amount === -1 ? (debit === -1 ? 2 : null) : amount,
    debit: amount === -1 && debit !== -1 ? debit : null,
    credit: amount === -1 && credit !== -1 ? credit : null,
  };
}

// French month names, full or short, with or without accent or final dot (and English ones,
// for exports in English).
// prettier-ignore
const MONTHS: Record<string, number> = {
  janvier: 1, janv: 1, jan: 1, january: 1,
  fevrier: 2, fevr: 2, fev: 2, feb: 2, february: 2,
  mars: 3, mar: 3, march: 3,
  avril: 4, avr: 4, apr: 4, april: 4,
  mai: 5, may: 5,
  juin: 6, jun: 6, june: 6,
  juillet: 7, juil: 7, jul: 7, july: 7,
  aout: 8, aug: 8, august: 8,
  septembre: 9, sept: 9, sep: 9, september: 9,
  octobre: 10, oct: 10, october: 10,
  novembre: 11, nov: 11, november: 11,
  decembre: 12, dec: 12, december: 12,
};

function utcDay(year: number, month: number, day: number): Date | null {
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

// "15/10/2026", "15-10-26", "2026-10-15", "15.10.2026", "1 janv. 2026", "15 février 2026",
// "1er août 2026" → the day as a UTC midnight Date. A time after the date is ignored.
export function parseBankDate(value: string): Date | null {
  const text = normalize(value);
  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[t\s].*)?$/);
  if (iso) return utcDay(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const fr = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})(?:\s.*)?$/);
  if (fr) {
    const year = Number(fr[3]);
    return utcDay(year < 100 ? year + 2000 : year, Number(fr[2]), Number(fr[1]));
  }
  const words = text.match(/^(\d{1,2})(?:er)?\s+([a-z]+)\.?\s+(\d{4})(?:[\s,].*)?$/);
  if (words && MONTHS[words[2]]) {
    return utcDay(Number(words[3]), MONTHS[words[2]], Number(words[1]));
  }
  return null;
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
  // Refused: shown as an error, the import waits for « Ignorer ces lignes ».
  | { line: number; ok: false; ignored?: false; error: string }
  // Set aside without error: a 0,00 € line (card check, cancelled payment) moves no money.
  | { line: number; ok: false; ignored: true; error: string };

// Rows → transactions with their line number (header = line 1), or the reason they are refused.
export function mapRows(rows: string[][], mapping: CsvMapping): ParsedLine[] {
  return rows.map((row, index): ParsedLine => {
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
    if (amountCents === null) return { line, ok: false, error: 'montant illisible' };
    if (amountCents === 0) return { line, ok: false, ignored: true, error: 'montant nul' };
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
