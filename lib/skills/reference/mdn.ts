import bcd from '@mdn/browser-compat-data' with { type: 'json' };
import type { ReferenceKind } from '@/generated/prisma/client';
import {
  CSS_COMMON,
  CSS_COMMON_AT_RULES,
  CSS_COMMON_SELECTORS,
  cssPropertyGroup,
  cssSelectorName,
  DOM_GROUP,
  DOM_INTERFACES,
  HTML_COMMON,
  HTML_COMMON_ATTRIBUTES,
  htmlElementGroup,
  JS_COMMON,
  jsObjectGroup,
} from './mdn-groups';
import { isMdnSkill, MDN_SKILLS, type MdnSkill } from './mdn-skills';

export { isMdnSkill, MDN_SKILLS, type MdnSkill };

// Reference lists of the web skills, built from MDN's open data (@mdn/browser-compat-data, CC0).
// Server-only: the data set is large. No AI call here (summaries come with the entry details).

export type MdnEntry = {
  name: string;
  kind: ReferenceKind;
  group: string;
  docUrl: string | null;
  isDeprecated: boolean;
  isCommon: boolean;
};

type Compat = {
  mdn_url?: string;
  spec_url?: string | string[];
  status?: { standard_track: boolean; deprecated: boolean; experimental?: boolean };
};
type Feature = { __compat?: Compat; [key: string]: unknown };

const subFeatures = (feature: Feature) =>
  Object.entries(feature).filter(([key]) => key !== '__compat') as [string, Feature][];

// Standard features only: non-standard ones are browser-specific curiosities.
const isStandard = (compat: Compat | undefined) => compat?.status?.standard_track === true;

function entry(
  name: string,
  kind: ReferenceKind,
  group: string,
  compat: Compat,
  isCommon: boolean
): MdnEntry {
  return {
    name,
    kind,
    group,
    docUrl: compat.mdn_url ?? null,
    isDeprecated: compat.status?.deprecated === true,
    isCommon,
  };
}

function cssEntries(): MdnEntry[] {
  const entries: MdnEntry[] = [];
  for (const [name, feature] of subFeatures(bcd.css.properties as Feature)) {
    if (!isStandard(feature.__compat)) continue;
    entries.push(
      entry(name, 'PROPERTY', cssPropertyGroup(name), feature.__compat!, CSS_COMMON.has(name))
    );
  }
  for (const [key, feature] of subFeatures(bcd.css['at-rules'] as Feature)) {
    if (!isStandard(feature.__compat)) continue;
    const name = `@${key}`;
    entries.push(
      entry(name, 'AT_RULE', 'Règles @', feature.__compat!, CSS_COMMON_AT_RULES.has(name))
    );
  }
  for (const [key, feature] of subFeatures(bcd.css.selectors as Feature)) {
    if (!isStandard(feature.__compat)) continue;
    const name = cssSelectorName(key);
    entries.push(
      entry(name, 'SELECTOR', 'Sélecteurs', feature.__compat!, CSS_COMMON_SELECTORS.has(name))
    );
  }
  return entries;
}

function htmlEntries(): MdnEntry[] {
  const entries: MdnEntry[] = [];
  for (const [tag, feature] of subFeatures(bcd.html.elements as Feature)) {
    if (!isStandard(feature.__compat)) continue;
    entries.push(
      entry(`<${tag}>`, 'ELEMENT', htmlElementGroup(tag), feature.__compat!, HTML_COMMON.has(tag))
    );
  }
  for (const [key, feature] of subFeatures(bcd.html.global_attributes as Feature)) {
    if (!isStandard(feature.__compat)) continue;
    const name = key === 'data_attributes' ? 'data-*' : key;
    entries.push(
      entry(
        name,
        'ATTRIBUTE',
        'Attributs globaux',
        feature.__compat!,
        HTML_COMMON_ATTRIBUTES.has(name)
      )
    );
  }
  return entries;
}

// "Array.prototype.map" for instance methods, "Array.from" for static ones (read from the
// spec anchor, the only place where MDN data tells them apart).
function jsMemberName(object: string, member: string, compat: Compat): string {
  const specs = Array.isArray(compat.spec_url) ? compat.spec_url : [compat.spec_url ?? ''];
  const isPrototype = specs.some((url) => /\.prototype\./i.test(url));
  return isPrototype ? `${object}.prototype.${member}` : `${object}.${member}`;
}

function jsEntries(): MdnEntry[] {
  const entries: MdnEntry[] = [];
  for (const [object, feature] of subFeatures(bcd.javascript.builtins as Feature)) {
    if (!isStandard(feature.__compat)) continue;
    const group = jsObjectGroup(object);
    const isFunction = /^[a-z]/.test(object);
    entries.push(
      entry(
        object,
        isFunction ? 'FUNCTION' : 'OBJECT',
        group,
        feature.__compat!,
        JS_COMMON.has(object)
      )
    );
    for (const [member, sub] of subFeatures(feature)) {
      // Constructors repeat the object name; well-known symbols are rarely written by hand.
      if (member === object || member.startsWith('@@') || !isStandard(sub.__compat)) continue;
      const name = jsMemberName(object, member, sub.__compat!);
      entries.push(entry(name, 'METHOD', group, sub.__compat!, JS_COMMON.has(name)));
    }
  }
  const api = bcd.api as Feature;
  for (const name of DOM_INTERFACES) {
    const feature = api[name] as Feature | undefined;
    if (!feature?.__compat || !isStandard(feature.__compat)) continue;
    entries.push(
      entry(
        name,
        name === 'fetch' ? 'FUNCTION' : 'OBJECT',
        DOM_GROUP,
        feature.__compat,
        JS_COMMON.has(name)
      )
    );
    for (const [member, sub] of subFeatures(feature)) {
      if (
        member === name ||
        member.includes('_') ||
        !isStandard(sub.__compat) ||
        sub.__compat?.status?.deprecated
      ) {
        continue;
      }
      const memberName = `${name}.${member}`;
      entries.push(
        entry(memberName, 'METHOD', DOM_GROUP, sub.__compat!, JS_COMMON.has(memberName))
      );
    }
  }
  return entries;
}

// The full list of one web skill. Names are unique per kind, as in the database.
export function buildMdnEntries(skill: MdnSkill): MdnEntry[] {
  const entries = skill === 'css' ? cssEntries() : skill === 'html' ? htmlEntries() : jsEntries();
  const seen = new Set<string>();
  return entries.filter((item) => {
    const key = `${item.kind}:${item.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
