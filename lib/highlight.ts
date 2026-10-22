import {
  createCssVariablesTheme,
  createHighlighter,
  type BundledLanguage,
  type Highlighter,
} from 'shiki';

// Server-side syntax highlighting (code view, notion sheets). Colours are CSS variables (--shiki-*), mapped to the
// design tokens in app/globals.css, so the code view follows the theme without raw colours.
const theme = createCssVariablesTheme({ name: 'hushyboard', variablePrefix: '--shiki-' });

let highlighter: Promise<Highlighter> | null = null;
function getHighlighter() {
  highlighter ??= createHighlighter({ themes: [theme], langs: [] });
  return highlighter;
}

export async function highlightCode(code: string, language: string): Promise<string> {
  const instance = await getHighlighter();
  let lang = 'text';
  if (language !== 'text') {
    try {
      // Grammars are loaded on demand, the first time a language is shown.
      if (!instance.getLoadedLanguages().includes(language)) {
        await instance.loadLanguage(language as BundledLanguage);
      }
      lang = language;
    } catch {
      lang = 'text';
    }
  }
  return instance.codeToHtml(code, { lang, theme: 'hushyboard' });
}
