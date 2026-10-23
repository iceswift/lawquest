import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Text, View } from '@/components/Themed';
import { useAppTheme } from '../context/ThemeContext';
import Colors from '@/constants/Colors';

const COUNTRIES = [
  { id: 'th', name: 'Thailand', flag: '🇹🇭', available: true, code: 'TH', region: 'Southeast Asia' },
  { id: 'us', name: 'United States', flag: '🇺🇸', available: false, code: 'US', region: 'North America' },
  { id: 'uk', name: 'United Kingdom', flag: '🇬🇧', available: false, code: 'UK', region: 'Europe' },
  { id: 'sg', name: 'Singapore', flag: '🇸🇬', available: false, code: 'SG', region: 'Southeast Asia' },
  { id: 'jp', name: 'Japan', flag: '🇯🇵', available: false, code: 'JP', region: 'East Asia' },
  { id: 'fr', name: 'France', flag: '🇫🇷', available: false, code: 'FR', region: 'Europe' },
];

export default function CountryScreen() {
  const { isDark, tintColor, colors, typography } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = COUNTRIES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: tintColor, fontFamily: typography.fonts.bold }]}>JURISDICTION</Text>
          <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.regal }]}>Select Country</Text>
          <Text style={[styles.subtitle, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
            Navigate through global legal systems
          </Text>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: colors.parchment, borderColor: colors.goldSubtle }]}>
          <Ionicons name="search" size={18} color={colors.subtext} style={styles.searchIcon} />
          <TextInput
            placeholder="Search nations..."
            placeholderTextColor={colors.subtext + '80'}
            style={[styles.searchInput, { color: colors.text, fontFamily: typography.fonts.primary }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Embassy Card List */}
        <View style={styles.listSection}>
          {filteredCountries.map((country) => (
            <TouchableOpacity
              key={country.id}
              activeOpacity={country.available ? 0.82 : 1}
              onPress={() => country.available && router.back()}
              style={[
                styles.countryCard,
                { 
                  backgroundColor: colors.card, 
                  borderColor: country.available ? colors.goldSubtle : 'transparent',
                  opacity: country.available ? 1 : 0.45
                }
              ]}
              disabled={!country.available}
            >
              <View style={styles.countryMain}>
                <View style={[styles.flagSeal, { backgroundColor: colors.surfaceSoft, borderColor: country.available ? colors.glassBorder : 'transparent' }]}>
                  <Text style={styles.flagEmoji}>{country.flag}</Text>
                </View>
                <View style={styles.countryInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.countryName, { color: colors.text, fontFamily: typography.fonts.regal }]}>
                      {country.name}
                    </Text>
                    {!country.available && (
                      <View style={[styles.statusTag, { backgroundColor: colors.surfaceStrong }]}>
                        <Text style={[styles.statusTagText, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>ARCHIVED</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.regionText, { color: tintColor, fontFamily: typography.fonts.bold }]}>
                    {country.region.toUpperCase()}
                  </Text>
                  <Text style={[styles.availabilityText, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
                    {country.available ? 'Complete archive accessible' : 'Access pending clearance'}
                  </Text>
                </View>
              </View>

              {country.available && (
                <View style={[styles.arrowBox, { backgroundColor: colors.goldSubtle }]}>
                  <Ionicons name="chevron-forward" size={18} color={tintColor} />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 0,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    paddingHorizontal: 18,
    marginBottom: 35,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Inter-Medium",
    fontSize: 15,
  },
  listSection: {
    gap: 16,
    backgroundColor: 'transparent',
  },
  countryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 28,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  countryMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    flex: 1,
  },
  flagSeal: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  flagEmoji: {
    fontSize: 28,
  },
  countryInfo: {
    marginLeft: 20,
    backgroundColor: 'transparent',
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    gap: 8,
  },
  countryName: {
    fontFamily: "Cormorant-Bold",
    fontSize: 22,
    letterSpacing: -0.2,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTagText: {
    fontFamily: "Inter-Bold",
    fontSize: 8,
    letterSpacing: 0.5,
  },
  regionText: {
    fontFamily: "Inter-Bold",
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
    opacity: 0.8,
  },
  availabilityText: {
    fontFamily: "Inter-Medium",
    fontSize: 11,
    marginTop: 6,
    opacity: 0.5,
  },
  arrowBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});
