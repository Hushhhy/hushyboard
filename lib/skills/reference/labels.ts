// French labels of the « Référence » tab (enum values stay in English in the data).

export const REFERENCE_KIND_LABELS: Record<string, string> = {
  ELEMENT: 'Élément',
  ATTRIBUTE: 'Attribut',
  PROPERTY: 'Propriété',
  AT_RULE: 'Règle @',
  SELECTOR: 'Sélecteur',
  FUNCTION: 'Fonction',
  METHOD: 'Méthode',
  OBJECT: 'Objet',
  KEYWORD: 'Mot-clé',
  TYPE: 'Type',
  COMMAND: 'Commande',
  CLASS: 'Classe',
  HOOK: 'Hook',
  OTHER: 'Entrée',
};

export const REFERENCE_SOURCE_LABELS: Record<string, string> = {
  MDN: 'MDN',
  AI: 'IA',
  MANUAL: 'ajoutée par toi',
};

// Only http(s) links are rendered; the link text says where it goes.
export function docLink(url: string | null | undefined): { href: string; label: string } | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return {
      href: parsed.toString(),
      label: parsed.hostname === 'developer.mozilla.org' ? 'MDN' : 'Documentation',
    };
  } catch {
    return null;
  }
}
