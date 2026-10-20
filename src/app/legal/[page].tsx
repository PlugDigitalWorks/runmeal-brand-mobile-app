import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { BRAND } from '@brand';
import { legalDocument, type LegalBlock, type LegalPage } from '@/content/legal';
import { colors, font, space } from '@/theme';

/** The privacy policy or terms of use, read in the app rather than in a browser. */
export default function LegalScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { page } = useLocalSearchParams<{ page: string }>();
  const doc = legalDocument((page === 'terms' ? 'terms' : 'privacy') satisfies LegalPage, BRAND.name);

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Text style={styles.title} accessibilityRole="header">
          {doc.title}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={t('common.close')}>
          <X size={24} color={colors.zinc500} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.updated}>{t('legal.updated', { date: doc.updated })}</Text>
        {doc.intro.map((block, i) => (
          <Block key={i} block={block} />
        ))}
        {doc.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text style={styles.heading} accessibilityRole="header">
              {section.heading}
            </Text>
            {section.body.map((block, i) => (
              <Block key={i} block={block} />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (!Array.isArray(block)) return <Text style={styles.body}>{block}</Text>;
  return (
    <View style={styles.list}>
      {block.map((item) => (
        <View key={item} style={styles.bullet}>
          <Text style={styles.body}>•</Text>
          <Text style={[styles.body, styles.bulletText]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.card },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.zinc200,
  },
  title: { fontSize: font.heading + 2, fontWeight: '800', color: colors.zinc900 },
  content: { padding: space.xl, gap: space.md },
  updated: { fontSize: font.small, color: colors.zinc500 },
  section: { gap: 8, marginTop: 4 },
  heading: { fontSize: font.base + 1, fontWeight: '700', color: colors.zinc900 },
  body: { fontSize: font.body, lineHeight: 21, color: colors.zinc700 },
  list: { gap: 6 },
  bullet: { flexDirection: 'row', gap: 8 },
  bulletText: { flex: 1 },
});
