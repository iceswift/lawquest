import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Platform, ScrollView, TextInput, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ColorPicker, { Panel1, Swatches, Preview, HueSlider } from 'reanimated-color-picker';
import type { ColorFormatsObject } from 'reanimated-color-picker';
import { StatusBar } from 'expo-status-bar';

import { Text, View } from '@/components/Themed';
import { useAppTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import Colors from '@/constants/Colors';

const PRESET_COLORS = [
  // Row 1: Primary vibrant colors
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#D946EF', // Fuchsia

  // Row 2: Softer/alternative colors
  '#F43F5E', // Rose
  '#14B8A6', // Teal
  '#0EA5E9', // Sky
  '#6366F1', // Indigo
  '#8B4513', // SaddleBrown
  '#708090', // SlateGray
  '#000000', // Black
  '#FFFFFF', // White
];

export default function ThemeColorModal() {
  const { t } = useTranslation();
  const { tintColor, setTintColor, isDark, typography } = useAppTheme();
  
  const textColor = isDark ? Colors.dark.text : Colors.light.text;
  const subtextColor = isDark ? Colors.dark.subtext : Colors.light.subtext;
  const cardBg = isDark ? Colors.dark.card : Colors.light.card;
  const borderColor = isDark ? Colors.dark.border : Colors.light.border;

  const [tempColor, setTempColor] = useState(tintColor);
  const [hexInput, setHexInput] = useState(tintColor.toUpperCase());

  const onColorChange = (result: ColorFormatsObject) => {
    setTempColor(result.hex);
    setHexInput(result.hex.toUpperCase());
  };

  const handleHexInputChange = (text: string) => {
    let formattedText = text;
    if (!text.startsWith('#') && text.length > 0) {
      formattedText = '#' + text;
    }
    setHexInput(formattedText.toUpperCase());

    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexRegex.test(formattedText)) {
      setTempColor(formattedText.toLowerCase());
    }
  };

  const getContrastColor = (hexColor: string) => {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Calculate luminance
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#121418' : '#FFFFFF';
  };

  const saveCustomColor = () => {
    setTintColor(tempColor);
    router.back();
  };

  const buttonTextColor = getContrastColor(tempColor);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: isDark ? Colors.dark.background : Colors.light.background }]}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: tintColor, fontFamily: typography.fonts.bold }]}>
            COLLECTION PERSONALIZATION
          </Text>
          <Text style={[styles.title, { color: textColor, fontFamily: typography.fonts.regal }]}>
            Theme Color
          </Text>
          <Text style={[styles.subtitle, { color: subtextColor, fontFamily: typography.fonts.primary }]}>
            CUSTOMIZE YOUR ARCHIVE AESTHETIC
          </Text>
        </View>

        {/* Executive Preview Card */}
        <View style={[styles.previewCard, { backgroundColor: cardBg, borderColor: borderColor }]}>
          <View style={styles.previewMain}>
            <View style={[styles.previewSwatch, { backgroundColor: tempColor, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <Ionicons name="color-palette" size={38} color={buttonTextColor} />
            </View>
            <View style={styles.previewInfo}>
              <Text style={[styles.hexLabel, { color: subtextColor }]}>Master Hex Code</Text>
              <Text style={[styles.hexValue, { color: textColor }]}>{tempColor.toUpperCase()}</Text>
              <Text style={[styles.colorDescription, { color: subtextColor }]}>
                This shade will define your primary highlights and authoritative UI elements.
              </Text>
            </View>
          </View>
        </View>

        <ColorPicker
          value={tempColor}
          onChangeJS={onColorChange}
          onCompleteJS={onColorChange}
          style={styles.picker}
        >
          <Panel1 style={styles.panel} />
          <HueSlider style={styles.slider} />
          
          <View style={[styles.inputRow, { borderTopColor: borderColor }]}>
            <Text style={[styles.inputLabel, { color: subtextColor }]}>{t('themeColor.manualHex').toUpperCase()}</Text>
            <View style={[styles.textInputContainer, { backgroundColor: isDark ? '#121418' : '#F4F4F2', borderColor: borderColor }]}>
              <Text style={[styles.hashSymbol, { color: subtextColor }]}>#</Text>
              <TextInput
                style={[styles.hexInput, { color: textColor }]}
                value={hexInput.replace('#', '')}
                onChangeText={handleHexInputChange}
                placeholder="000000"
                placeholderTextColor={subtextColor}
                autoCapitalize="characters"
                maxLength={6}
                keyboardType={Platform.OS === 'ios' ? 'default' : 'visible-password'}
              />
            </View>
          </View>

          <View style={styles.swatchesHeader}>
            <Text style={[styles.swatchesTitle, { color: subtextColor }]}>{t('themeColor.quickPresets').toUpperCase()}</Text>
          </View>
          <Swatches colors={PRESET_COLORS} style={styles.swatches} />
        </ColorPicker>

        <TouchableOpacity 
          style={[styles.applyButton, { backgroundColor: tempColor }]}
          onPress={saveCustomColor}
        >
          <Text style={[styles.applyButtonText, { color: buttonTextColor }]}>APPLY TO CHAMBERS</Text>
        </TouchableOpacity>
      </ScrollView>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  header: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 32,
  },
  eyebrow: {
    fontFamily: "Inter-Bold",
    fontSize: 10,
    letterSpacing: 2.5,
    marginBottom: 4,
    textTransform: "uppercase",
    opacity: 0.5,
    textAlign: 'center',
  },
  title: {
    fontFamily: "Cormorant-Bold",
    fontSize: 34,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Inter-Medium",
    fontSize: 12,
    marginTop: 6,
    opacity: 0.5,
    textAlign: "center",
  },
  previewCard: {
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    marginBottom: 35,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  previewMain: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  previewSwatch: {
    width: 80,
    height: 80,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  previewInfo: {
    marginLeft: 24,
    backgroundColor: 'transparent',
    flex: 1,
  },
  hexLabel: {
    fontFamily: "Cormorant-Bold",
    fontSize: 14,
    letterSpacing: 0.5,
    marginBottom: 2,
    opacity: 0.7,
  },
  hexValue: {
    fontFamily: "Inter-Bold",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  colorDescription: {
    fontFamily: "Inter-Medium",
    fontSize: 11,
    marginTop: 6,
    opacity: 0.5,
    lineHeight: 16,
  },
  picker: {
    width: '100%',
  },
  panel: {
    height: 220,
    borderRadius: 32,
    marginBottom: 24,
  },
  slider: {
    height: 44,
    borderRadius: 22,
    marginBottom: 32,
  },
  inputRow: {
    paddingTop: 24,
    borderTopWidth: 1,
    marginBottom: 32,
    backgroundColor: 'transparent',
  },
  inputLabel: {
    fontFamily: "Inter-Bold",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 12,
    opacity: 0.6,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
  },
  hashSymbol: {
    fontFamily: "Inter-Bold",
    fontSize: 18,
    marginRight: 8,
    opacity: 0.4,
  },
  hexInput: {
    flex: 1,
    fontFamily: "Inter-Bold",
    fontSize: 18,
  },
  swatchesHeader: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  swatchesTitle: {
    fontFamily: "Inter-Bold",
    fontSize: 11,
    letterSpacing: 1,
    opacity: 0.6,
  },
  swatches: {
    justifyContent: 'space-between',
    gap: 12,
  },
  applyButton: {
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  applyButtonText: {
    color: 'white',
    fontFamily: "Inter-Bold",
    fontSize: 16,
    letterSpacing: 1,
  },
});

