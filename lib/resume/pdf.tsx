import path from 'node:path';
import {
  Document,
  Font,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { ResumeContent } from './schema';

// Print version of the brand: white paper, graphite text, one gold rule.
// The PDF is not the app UI, so it uses its own print colors (no Tailwind tokens here).
//
// Built to be read by applicant tracking systems (ATS) as well as people:
// - one column, in reading order (two columns get mixed up by many parsers);
// - plain text everywhere: no icons, images or tables, bullets are "•" in the line itself;
// - standard French section titles that parsers recognise;
// - real, selectable text with embedded fonts, plus title, author and keywords metadata.
const PAPER = '#FFFFFF';
const INK = '#1E2126';
const INK_SOFT = '#4A4F57';
const GOLD = '#A87B1E';

// Fonts are local OFL files (public/fonts), shipped with the route through
// outputFileTracingIncludes in next.config.ts.
const fontsDir = path.join(process.cwd(), 'public', 'fonts');
Font.register({
  family: 'Plex',
  fonts: [
    { src: path.join(fontsDir, 'IBMPlexSans-Regular.ttf'), fontWeight: 400 },
    { src: path.join(fontsDir, 'IBMPlexSans-Medium.ttf'), fontWeight: 500 },
    { src: path.join(fontsDir, 'IBMPlexSans-SemiBold.ttf'), fontWeight: 600 },
  ],
});
Font.register({
  family: 'Bricolage',
  src: path.join(fontsDir, 'BricolageGrotesque-Bold.ttf'),
  fontWeight: 700,
});
// No automatic hyphenation: French words cut in the middle look like typos on a CV,
// and a parser would read two half-words.
Font.registerHyphenationCallback((word) => [word]);

// Sizes and spacing scale with the density (1 = normal): a long CV is printed a little tighter
// so it fits on one page.
function makeStyles(density: number) {
  const n = (value: number) => Math.round(value * density * 100) / 100;
  return StyleSheet.create({
    page: {
      backgroundColor: PAPER,
      color: INK,
      fontFamily: 'Plex',
      fontSize: n(9.5),
      lineHeight: 1.4,
      paddingVertical: n(36),
      paddingHorizontal: n(44),
    },
    // Line heights in points: a ratio would be taken from the page font size and the
    // big headline would overlap the next line.
    headline: {
      fontFamily: 'Bricolage',
      fontWeight: 700,
      fontSize: n(22),
      lineHeight: `${n(28)}pt`,
    },
    name: { fontSize: n(13), lineHeight: `${n(18)}pt`, fontWeight: 600, marginTop: n(2) },
    contact: { fontSize: n(8.5), lineHeight: `${n(12)}pt`, color: INK_SOFT, marginTop: n(3) },
    rule: { height: 2, backgroundColor: GOLD, marginTop: n(10), marginBottom: n(14), width: 64 },
    section: { marginBottom: n(12) },
    sectionTitle: {
      fontSize: n(9),
      fontWeight: 600,
      color: GOLD,
      marginBottom: n(5),
      paddingBottom: n(2),
      borderBottomWidth: 0.5,
      borderBottomColor: '#D8D2C4',
    },
    itemTitle: { fontWeight: 600, fontSize: n(10) },
    meta: { fontSize: n(8.5), color: INK_SOFT },
    bullet: { marginTop: n(1.5), paddingLeft: n(8) },
    link: { color: INK_SOFT, textDecoration: 'none' },
    item: { marginBottom: n(7) },
    skillLine: { marginBottom: n(1.5) },
    skillLabel: { fontWeight: 600 },
  });
}

type Styles = ReturnType<typeof makeStyles>;

// Standard French headings, in the order recruiters and ATS expect for a junior profile.
export const RESUME_SECTION_TITLES = {
  summary: 'PROFIL',
  skills: 'COMPÉTENCES',
  projects: 'PROJETS',
  experiences: 'EXPÉRIENCE PROFESSIONNELLE',
  education: 'FORMATION',
  languages: 'LANGUES',
  interests: 'CENTRES D’INTÉRÊT',
} as const;

// The sections that have content, in printing order. Pure, unit-tested.
export function resumeSectionOrder(content: ResumeContent): (keyof typeof RESUME_SECTION_TITLES)[] {
  const present = {
    summary: Boolean(content.summary),
    skills: content.skillGroups.some((group) => group.items.length > 0),
    projects: content.projects.length > 0,
    experiences: content.experiences.length > 0,
    education: content.education.length > 0,
    languages: content.languages.length > 0,
    interests: content.interests.length > 0,
  };
  return (Object.keys(RESUME_SECTION_TITLES) as (keyof typeof RESUME_SECTION_TITLES)[]).filter(
    (key) => present[key]
  );
}

// Keywords metadata: every skill and technology, once.
export function resumeKeywords(content: ResumeContent): string {
  const words = [
    ...content.skillGroups.flatMap((group) => group.items),
    ...content.projects.flatMap((project) => project.technologies),
  ].map((word) => word.replace(/\s*\(en cours d['’]apprentissage\)/i, '').trim());
  return [...new Set(words.filter(Boolean))].join(', ');
}

function Section({
  title,
  styles,
  children,
}: {
  title: string;
  styles: Styles;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const joinDates = (start: string, end: string) => [start, end].filter(Boolean).join(' – ');
// "École 42 – École 42" → "École 42": a part equal to the previous one is printed once.
export const joinDistinct = (...parts: string[]) =>
  parts
    .filter(
      (part, index) =>
        part && parts.findIndex((p) => p.toLowerCase() === part.toLowerCase()) === index
    )
    .join(' – ');
const fullUrl = (url: string) => (/^https?:\/\//.test(url) ? url : `https://${url}`);
const shortUrl = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '');

export function ResumeDocument({
  content,
  title,
  density = 1,
}: {
  content: ResumeContent;
  title: string;
  density?: number;
}) {
  const styles = makeStyles(density);
  const { header } = content;
  const contact = [header.location, header.email, header.phone].filter(Boolean).join(' | ');
  const links = [header.github, header.linkedin, header.website].filter(Boolean);
  // The job title comes first: it is what a recruiter (and an ATS) matches with the offer.
  const headline = header.title || header.fullName;

  const sections: Record<keyof typeof RESUME_SECTION_TITLES, React.ReactNode> = {
    summary: <Text>{content.summary}</Text>,
    skills: content.skillGroups
      .filter((group) => group.items.length > 0)
      .map((group) => (
        <Text key={group.name} style={styles.skillLine}>
          <Text style={styles.skillLabel}>{group.name} : </Text>
          {group.items.join(', ')}
        </Text>
      )),
    projects: content.projects.map((project) => (
      <View key={project.name} style={styles.item} wrap={false}>
        <Text style={styles.itemTitle}>{project.name}</Text>
        {project.technologies.length > 0 ? (
          <Text style={styles.meta}>Technologies : {project.technologies.join(', ')}</Text>
        ) : null}
        {project.description ? <Text>{project.description}</Text> : null}
        {project.url ? (
          <Link style={styles.link} src={fullUrl(project.url)}>
            {shortUrl(project.url)}
          </Link>
        ) : null}
      </View>
    )),
    experiences: content.experiences.map((experience, index) => (
      <View key={`${experience.title}-${index}`} style={styles.item} wrap={false}>
        <Text style={styles.itemTitle}>
          {joinDistinct(experience.title, experience.organization)}
        </Text>
        <Text style={styles.meta}>
          {[joinDates(experience.start, experience.end), experience.location]
            .filter(Boolean)
            .join(' | ')}
        </Text>
        {experience.bullets.map((bullet, bulletIndex) => (
          <Text key={bulletIndex} style={styles.bullet}>
            • {bullet}
          </Text>
        ))}
      </View>
    )),
    education: content.education.map((education, index) => (
      <View key={`${education.degree}-${index}`} style={styles.item} wrap={false}>
        <Text style={styles.itemTitle}>{joinDistinct(education.degree, education.school)}</Text>
        {education.start || education.end ? (
          <Text style={styles.meta}>{joinDates(education.start, education.end)}</Text>
        ) : null}
        {education.details ? <Text>{education.details}</Text> : null}
      </View>
    )),
    languages: (
      <Text>
        {content.languages
          .map((language) =>
            language.level ? `${language.name} (${language.level})` : language.name
          )
          .join(', ')}
      </Text>
    ),
    interests: <Text>{content.interests.join(', ')}</Text>,
  };

  return (
    <Document
      title={header.title ? `${header.fullName} – ${header.title}` : title}
      author={header.fullName}
      subject={title}
      keywords={resumeKeywords(content)}
      language="fr"
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.headline}>{headline}</Text>
        {header.title ? <Text style={styles.name}>{header.fullName}</Text> : null}
        {contact ? <Text style={styles.contact}>{contact}</Text> : null}
        {links.length > 0 ? (
          <Text style={styles.contact}>
            {links.map((url, index) => (
              <Text key={url}>
                {index > 0 ? ' | ' : ''}
                <Link style={styles.link} src={fullUrl(url)}>
                  {shortUrl(url)}
                </Link>
              </Text>
            ))}
          </Text>
        ) : null}
        <View style={styles.rule} />

        {resumeSectionOrder(content).map((key) => (
          <Section key={key} title={RESUME_SECTION_TITLES[key]} styles={styles}>
            {sections[key]}
          </Section>
        ))}
      </Page>
    </Document>
  );
}

// Pages of a rendered PDF: page objects stay readable even when content streams are compressed.
export function countPdfPages(pdf: Buffer): number {
  return pdf.toString('latin1').match(/\/Type\s*\/Page(?!s)/g)?.length ?? 0;
}

// Tighter and tighter until the CV fits on one page (recruiters expect one page for a
// junior profile). Beyond the last density, text would get too small: two pages then.
export const DENSITIES = [1, 0.94, 0.88, 0.83, 0.78];

export async function renderResumePdf(content: ResumeContent, title: string): Promise<Buffer> {
  let pdf: Buffer = Buffer.alloc(0);
  for (const density of DENSITIES) {
    pdf = await renderToBuffer(
      <ResumeDocument content={content} title={title} density={density} />
    );
    if (countPdfPages(pdf) <= 1) return pdf;
  }
  return pdf;
}

// "Alexis Carpentier" → "CV-Alexis-Carpentier.pdf"; a company is added for adapted CVs.
export function resumeFileName(fullName: string, company?: string): string {
  const slug = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  return ['CV', slug(fullName) || 'Hushyboard', company ? slug(company) : null]
    .filter(Boolean)
    .join('-')
    .concat('.pdf');
}
