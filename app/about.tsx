import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Image, ScrollView } from 'react-native';
import { Ionicons, FontAwesome } from '@expo/vector-icons';

import { Text, View } from '@/components/Themed';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../context/ThemeContext';
import Colors from '@/constants/Colors';

export default function AboutModal() {
  const { t } = useTranslation();
  const { isDark, colors, typography, tintColor } = useAppTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={[styles.logoContainer, { backgroundColor: tintColor }]}>
          <FontAwesome name="balance-scale" size={50} color={colors.onAccent} />
        </View>
        <Text style={[styles.appName, { color: colors.text, fontFamily: typography.fonts.regal }]}>LawQuest</Text>
        <Text style={[styles.version, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{t('about.version')}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.goldSubtle }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>{t('about.title')}</Text>
        <Text style={[styles.description, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
          {t('about.body')}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.goldSubtle }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>{t('about.developer')}</Text>
        <Text style={[styles.developerName, { color: colors.text, fontFamily: typography.fonts.bold }]}>{t('about.developerName')}</Text>
        <Text style={[styles.developerInfo, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{t('about.developerInfo')}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.copyright, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{t('about.copyright')}</Text>
      </View>

      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
    backgroundColor: 'transparent',
  },
  logoContainer: {
    width: 110,
    height: 110,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 15,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  appName: {
    fontSize: 34,
    letterSpacing: -0.5,
  },
  version: {
    fontSize: 14,
    marginTop: 8,
    opacity: 0.6,
  },
  card: {
    width: '100%',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'justify',
  },
  developerName: {
    fontSize: 16,
    marginBottom: 4,
  },
  developerInfo: {
    fontSize: 14,
    opacity: 0.7,
  },
  footer: {
    marginTop: 20,
    marginBottom: 40,
    backgroundColor: 'transparent',
  },
  copyright: {
    fontSize: 12,
    opacity: 0.5,
  },
});
