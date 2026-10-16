import { Bricolage_Grotesque, IBM_Plex_Sans } from 'next/font/google';

// UI text and all data (tabular digits, slashed zero).
export const plex = IBM_Plex_Sans({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plex',
});

// Display font: level titles, trophy names, large headings. Never used for data.
// next/font requires omitting `weight` when an axis is requested, so the full 200–800 range is loaded.
export const bricolage = Bricolage_Grotesque({
  axes: ['opsz'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-bricolage',
});
