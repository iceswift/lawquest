import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text, View } from '@/components/Themed';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../context/ThemeContext';
import Colors from '@/constants/Colors';

export default function NotificationsModal() {
  const { t } = useTranslation();
  const { isDark, tintColor, colors, typography } = useAppTheme();

  const notifications = [
    {
      id: '1',
      title: t('notifications.items.lawUpdateTitle'),
      desc: t('notifications.items.lawUpdateDesc'),
      time: t('notifications.items.twoHoursAgo'),
      isNew: true,
      category: 'LAW UPDATE',
      icon: 'document-text-outline',
    },
    {
      id: '2',
      title: t('notifications.items.scoreTitle'),
      desc: t('notifications.items.scoreDesc'),
      time: t('notifications.items.fiveHoursAgo'),
      isNew: true,
      category: 'SYSTEM',
      icon: 'shield-checkmark-outline',
    },
    {
      id: '3',
      title: t('notifications.items.savedTitle'),
      desc: t('notifications.items.savedDesc'),
      time: t('notifications.items.oneDayAgo'),
      isNew: false,
      category: 'ARCHIVE',
      icon: 'bookmark-outline',
    }
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        
        {/* Modal Header */}
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: tintColor, fontFamily: typography.fonts.bold }]}>
            DISPATCHES
          </Text>
          <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.regal }]}>
            Notifications
          </Text>
          <Text style={[styles.subtitle, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
            Latest updates and system alerts
          </Text>
        </View>

        {notifications.map((item, index) => (
          <TouchableOpacity 
            key={item.id} 
            style={[
              styles.notiCard, 
              { backgroundColor: colors.card, borderColor: colors.goldSubtle },
            ]}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.surfaceSoft, borderColor: colors.glassBorder }]}>
              <Ionicons name={item.icon as any} size={20} color={tintColor} />
            </View>
            <View style={styles.notiInfo}>
              <View style={styles.headerRow}>
                <Text style={[styles.category, { color: tintColor, fontFamily: typography.fonts.bold }]}>{item.category}</Text>
                <Text style={[styles.notiTime, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{item.time.toUpperCase()}</Text>
              </View>
              <View style={styles.titleRow}>
                <Text style={[styles.notiTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>{item.title}</Text>
                {item.isNew && <View style={[styles.dot, { backgroundColor: tintColor }]} />}
              </View>
              <Text style={[styles.notiDesc, { color: colors.subtext, fontFamily: typography.fonts.primary }]} numberOfLines={2}>{item.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {notifications.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.goldSubtle} />
            <Text style={[styles.emptyText, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>THE ARCHIVE IS QUIET</Text>
          </View>
        )}
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 32,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter-Bold",
    letterSpacing: 2.5,
    opacity: 0.5,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 34,
    fontFamily: "Cormorant-Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    marginTop: 6,
    opacity: 0.5,
  },
  notiCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.1)',
  },
  notiInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  category: {
    fontSize: 10,
    fontFamily: "Inter-Bold",
    letterSpacing: 0.5,
  },
  notiTime: {
    fontSize: 10,
    fontFamily: "Inter-Medium",
    opacity: 0.4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  notiTitle: {
    fontSize: 15,
    fontFamily: "Inter-Bold",
    flex: 1,
    marginRight: 8,
    letterSpacing: -0.2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  notiDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter-Medium",
    opacity: 0.6,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    backgroundColor: 'transparent',
  },
  emptyText: {
    marginTop: 20,
    fontSize: 12,
    fontFamily: "Inter-Bold",
    opacity: 0.4,
    letterSpacing: 1,
  },
});

