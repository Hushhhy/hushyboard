// Mermaid sources written for a light theme: a « classDef » or « style » line with a light
// fill and no text color would show light text on a light box in the dark theme. Such lines
// get a dark text color. Pure, unit-tested.

// Relative luminance (0 = black, 1 = white) of "#rgb" or "#rrggbb", null for anything else.
export function hexLuminance(color: string): number | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!match) return null;
  const hex =
    match[1].length === 3
      ? match[1]
          .split('')
          .map((digit) => digit + digit)
          .join('')
      : match[1];
  const [r, g, b] = [0, 2, 4].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function readableMermaidSource(source: string, darkText: string): string {
  return source
    .split('\n')
    .map((line) => {
      const match = /^(\s*(?:classDef|style)\s+\S+\s+)(.*)$/.exec(line);
      if (!match || /(^|[,;\s])color\s*:/.test(match[2])) return line;
      const fill = /(?:^|[,;\s])fill\s*:\s*(#[0-9a-f]{3,6})\b/i.exec(match[2]);
      const luminance = fill ? hexLuminance(fill[1]) : null;
      if (luminance === null || luminance < 0.5) return line;
      return `${line.replace(/[;,\s]+$/, '')},color:${darkText}`;
    })
    .join('\n');
}
