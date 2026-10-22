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

// Print version of the brand: ivory paper, graphite text, one gold rule.
// The PDF is not the app UI, so it uses its own print colors (no Tailwind tokens here).
const PAPER = '#F6F3EC';
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
// No automatic hyphenation: French words cut in the middle look like typos on a CV.
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    backgroundColor: PAPER,
    color: INK,
    fontFamily: 'Plex',
    fontSize: 9.5,
    lineHeight: 1.4,
    paddingVertical: 36,
    paddingHorizontal: 40,
  },
  // Line heights in points: a ratio would be taken from the page font size and the
  // big name would overlap the title.
  name: {
    fontFamily: 'Bricolage',
    fontWeight: 700,
    fontSize: 24,
    lineHeight: '30pt',
    letterSpacing: -0.4,
  },
  title: { fontSize: 12, lineHeight: '16pt', fontWeight: 500, color: INK_SOFT, marginTop: 2 },
  contact: { fontSize: 8.5, lineHeight: '12pt', color: INK_SOFT, marginTop: 4 },
  rule: { height: 2, backgroundColor: GOLD, marginTop: 12, marginBottom: 16, width: 64 },
  columns: { flexDirection: 'row', gap: 24 },
  side: { width: '30%', gap: 14 },
  main: { flex: 1, gap: 14 },
  sectionTitle: {
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: GOLD,
    marginBottom: 6,
  },
  itemTitle: { fontWeight: 600, fontSize: 10 },
  meta: { fontSize: 8.5, color: INK_SOFT },
  bullet: { flexDirection: 'row', gap: 4, marginTop: 2 },
  link: { color: INK_SOFT, textDecoration: 'none' },
  item: { marginBottom: 8 },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const joinDates = (start: string, end: string) => [start, end].filter(Boolean).join(' – ');

export function ResumeDocument({ content, title }: { content: ResumeContent; title: string }) {
  const { header } = content;
  const contact = [header.location, header.email, header.phone].filter(Boolean).join(' · ');
  const links = [header.github, header.linkedin, header.website].filter(Boolean);

  return (
    <Document title={title} author={header.fullName} language="fr">
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{header.fullName}</Text>
        {header.title ? <Text style={styles.title}>{header.title}</Text> : null}
        {contact ? <Text style={styles.contact}>{contact}</Text> : null}
        {links.length > 0 ? (
          <Text style={styles.contact}>
            {links.map((url, index) => (
              <Text key={url}>
                {index > 0 ? ' · ' : ''}
                <Link style={styles.link} src={/^https?:\/\//.test(url) ? url : `https://${url}`}>
                  {url.replace(/^https?:\/\//, '')}
                </Link>
              </Text>
            ))}
          </Text>
        ) : null}
        <View style={styles.rule} />

        <View style={styles.columns}>
          <View style={styles.side}>
            {content.skillGroups.map((group) => (
              <Section key={group.name} title={group.name}>
                <Text>{group.items.join(', ')}</Text>
              </Section>
            ))}
            {content.languages.length > 0 ? (
              <Section title="Langues">
                {content.languages.map((language) => (
                  <Text key={language.name}>
                    {language.name}
                    {language.level ? <Text style={styles.meta}> · {language.level}</Text> : null}
                  </Text>
                ))}
              </Section>
            ) : null}
            {content.interests.length > 0 ? (
              <Section title="Centres d’intérêt">
                <Text>{content.interests.join(', ')}</Text>
              </Section>
            ) : null}
          </View>

          <View style={styles.main}>
            {content.summary ? (
              <Section title="Profil">
                <Text>{content.summary}</Text>
              </Section>
            ) : null}
            {content.projects.length > 0 ? (
              <Section title="Projets">
                {content.projects.map((project) => (
                  <View key={project.name} style={styles.item} wrap={false}>
                    <Text style={styles.itemTitle}>{project.name}</Text>
                    {project.technologies.length > 0 ? (
                      <Text style={styles.meta}>{project.technologies.join(' · ')}</Text>
                    ) : null}
                    {project.description ? <Text>{project.description}</Text> : null}
                  </View>
                ))}
              </Section>
            ) : null}
            {content.experiences.length > 0 ? (
              <Section title="Expériences">
                {content.experiences.map((experience, index) => (
                  <View key={`${experience.title}-${index}`} style={styles.item} wrap={false}>
                    <Text style={styles.itemTitle}>{experience.title}</Text>
                    <Text style={styles.meta}>
                      {[
                        experience.organization,
                        experience.location,
                        joinDates(experience.start, experience.end),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    {experience.bullets.map((bullet, bulletIndex) => (
                      <View key={bulletIndex} style={styles.bullet}>
                        <Text>–</Text>
                        <Text style={{ flex: 1 }}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </Section>
            ) : null}
            {content.education.length > 0 ? (
              <Section title="Formation">
                {content.education.map((education, index) => (
                  <View key={`${education.degree}-${index}`} style={styles.item} wrap={false}>
                    <Text style={styles.itemTitle}>{education.degree}</Text>
                    <Text style={styles.meta}>
                      {[education.school, joinDates(education.start, education.end)]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    {education.details ? <Text>{education.details}</Text> : null}
                  </View>
                ))}
              </Section>
            ) : null}
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function renderResumePdf(content: ResumeContent, title: string): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument content={content} title={title} />);
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
