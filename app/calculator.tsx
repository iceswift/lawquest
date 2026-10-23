import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  View as NativeView,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { Text } from '@/components/Themed';
import { useAppTheme } from '../context/ThemeContext';

type InterestTag = 'general' | 'contract' | 'default' | 'judgment' | 'loan' | 'compound' | 'penalty';
type PickerTarget = 'start' | 'end';
type RetentionOption = 'never' | '1m' | '3m' | '6m' | '12m';

type CalcResult = {
  principal: number;
  rate: number;
  days: number;
  interest: number;
  total: number;
  interestPerDay: number;
  formula: string;
};

type HistoryEntry = {
  id: string;
  tagId: InterestTag;
  principal: number;
  rate: number;
  startDate: string;
  endDate: string;
  includeFirstDay: boolean;
  result: CalcResult;
  createdAt: string;
};

const HISTORY_KEY = '@lawquest_interest_history';
const RETENTION_KEY = '@lawquest_interest_history_retention';
const MAX_HISTORY_ITEMS = 50;

const INTEREST_TAGS: Array<{
  id: InterestTag;
  icon: React.ComponentProps<typeof Ionicons>['name'];
}> = [
    { id: 'general', icon: 'calculator-outline' },
    { id: 'contract', icon: 'document-text-outline' },
    { id: 'default', icon: 'alert-circle-outline' },
    { id: 'judgment', icon: 'ribbon-outline' },
    { id: 'loan', icon: 'cash-outline' },
    { id: 'compound', icon: 'repeat-outline' },
    { id: 'penalty', icon: 'warning-outline' },
  ];

const RETENTION_OPTIONS: Array<{
  id: RetentionOption;
  months: number | null;
}> = [
    { id: 'never', months: null },
    { id: '1m', months: 1 },
    { id: '3m', months: 3 },
    { id: '6m', months: 6 },
    { id: '12m', months: 12 },
  ];

const bahtFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat('th-TH', {
  maximumFractionDigits: 2,
});

function parseAmount(value: string) {
  return Number.parseFloat(value.replace(/,/g, '').trim());
}

function dateOnlyTime(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

function getDayCount(startDate: Date, endDate: Date, includeFirstDay: boolean) {
  const diff = Math.floor((dateOnlyTime(endDate) - dateOnlyTime(startDate)) / 86_400_000);
  return Math.max(0, diff + (includeFirstDay ? 1 : 0));
}

function monthsAgo(months: number) {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date.getTime();
}

function getTag(tagId: InterestTag) {
  return INTEREST_TAGS.find((item) => item.id === tagId) ?? INTEREST_TAGS[0];
}

function filterHistoryByRetention(history: HistoryEntry[], retention: RetentionOption) {
  const option = RETENTION_OPTIONS.find((item) => item.id === retention);
  if (!option?.months) return history;

  const cutoff = monthsAgo(option.months);
  return history.filter((entry) => new Date(entry.createdAt).getTime() >= cutoff);
}

export default function CalculatorScreen() {
  const { t, i18n } = useTranslation();
  const { isDark, tintColor, colors, typography } = useAppTheme();
  const resultCardRef = useRef<React.ElementRef<typeof NativeView>>(null);

  const [selectedTagId, setSelectedTagId] = useState<InterestTag>('general');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [includeFirstDay, setIncludeFirstDay] = useState(true);
  const [showPicker, setShowPicker] = useState<PickerTarget | null>(null);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [retention, setRetention] = useState<RetentionOption>('never');
  const [isSavingImage, setIsSavingImage] = useState(false);

  // Focus states for input canvases
  const [principalFocused, setPrincipalFocused] = useState(false);
  const [rateFocused, setRateFocused] = useState(false);

  const selectedTag = useMemo(() => getTag(selectedTagId), [selectedTagId]);
  const dateLocale = i18n.language === 'th' ? 'th-TH' : 'en-US';
  const tagLabel = (tag: (typeof INTEREST_TAGS)[number]) => t(`calculator.tags.${tag.id}.label`);
  const tagNote = (tag: (typeof INTEREST_TAGS)[number]) => t(`calculator.tags.${tag.id}.note`);
  const formatDisplayDate = (date: Date) =>
    date.toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const dayPreview = useMemo(
    () => getDayCount(startDate, endDate, includeFirstDay),
    [endDate, includeFirstDay, startDate],
  );

  useEffect(() => {
    void loadHistory();
  }, []);

  const persistHistory = async (nextHistory: HistoryEntry[], nextRetention = retention) => {
    const filtered = filterHistoryByRetention(nextHistory, nextRetention).slice(0, MAX_HISTORY_ITEMS);
    setHistory(filtered);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
  };

  const loadHistory = async () => {
    try {
      const [historyJson, retentionValue] = await Promise.all([
        AsyncStorage.getItem(HISTORY_KEY),
        AsyncStorage.getItem(RETENTION_KEY),
      ]);

      const savedRetention = RETENTION_OPTIONS.some((item) => item.id === retentionValue)
        ? (retentionValue as RetentionOption)
        : 'never';
      const savedHistory = historyJson ? (JSON.parse(historyJson) as HistoryEntry[]) : [];

      setRetention(savedRetention);
      await persistHistory(savedHistory, savedRetention);
    } catch {
      setHistory([]);
    }
  };

  const addHistoryEntry = async (nextResult: CalcResult) => {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      tagId: selectedTagId,
      principal: nextResult.principal,
      rate: nextResult.rate,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      includeFirstDay,
      result: nextResult,
      createdAt: new Date().toISOString(),
    };

    await persistHistory([entry, ...history]);
  };

  const calculate = () => {
    const p = parseAmount(principal);
    const r = Number.parseFloat(rate.trim());

    if (!Number.isFinite(p) || p <= 0) {
      Alert.alert(t('calculator.alerts.checkData'), t('calculator.alerts.invalidPrincipal'));
      return;
    }

    if (!Number.isFinite(r) || r < 0) {
      Alert.alert(t('calculator.alerts.checkData'), t('calculator.alerts.invalidRate'));
      return;
    }

    if (dateOnlyTime(endDate) < dateOnlyTime(startDate)) {
      Alert.alert(t('calculator.alerts.checkDate'), t('calculator.alerts.invalidDate'));
      return;
    }

    const days = getDayCount(startDate, endDate, includeFirstDay);
    const interest = (p * r * days) / (100 * 365);
    const total = p + interest;
    const nextResult = {
      principal: p,
      rate: r,
      days,
      interest,
      total,
      interestPerDay: days > 0 ? interest / days : 0,
      formula: `(${numberFormatter.format(p)} x ${numberFormatter.format(r)}% x ${t('calculator.days', { count: days })}) / (100 x 365)`,
    };

    setResult(nextResult);
    void addHistoryEntry(nextResult);
  };

  const clearForm = () => {
    setPrincipal('');
    setRate('');
    setStartDate(new Date());
    setEndDate(new Date());
    setIncludeFirstDay(true);
    setResult(null);
  };

  const buildResultText = () => {
    if (!result) return '';

    return [
      t('calculator.share.title'),
      t('calculator.share.contextTag', { label: tagLabel(selectedTag) }),
      t('calculator.share.principal', { value: bahtFormatter.format(result.principal) }),
      t('calculator.share.rate', { value: numberFormatter.format(result.rate) }),
      t('calculator.share.dateRange', { start: formatDisplayDate(startDate), end: formatDisplayDate(endDate) }),
      t('calculator.share.days', { count: result.days }),
      t('calculator.share.interest', { value: bahtFormatter.format(result.interest) }),
      t('calculator.share.total', { value: bahtFormatter.format(result.total) }),
      t('calculator.share.formula', { formula: result.formula }),
      t('calculator.share.tagNote', { note: tagNote(selectedTag) }),
      t('calculator.share.disclaimer'),
      t('calculator.share.footer'),
    ].join('\n');
  };

  const copyToClipboard = async () => {
    if (!result) return;

    await Clipboard.setStringAsync(buildResultText());
    Alert.alert(t('calculator.alerts.copiedTitle'), t('calculator.alerts.copiedMessage'));
  };

  const shareResult = async () => {
    if (!result) return;
    await Share.share({ message: buildResultText() });
  };

  const saveResultAsImage = async () => {
    if (!result || !resultCardRef.current || isSavingImage) return;

    try {
      setIsSavingImage(true);

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t('calculator.alerts.permissionTitle'), t('calculator.alerts.permissionMessage'));
        return;
      }

      const uri = await captureRef(resultCardRef, {
        format: 'png',
        quality: 1,
      });

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(t('calculator.alerts.savedTitle'), t('calculator.alerts.savedMessage'));
    } catch {
      Alert.alert(t('calculator.alerts.saveFailedTitle'), t('calculator.alerts.saveFailedMessage'));
    } finally {
      setIsSavingImage(false);
    }
  };

  const handleDateChange = (event: DateTimePickerEvent, date?: Date) => {
    setShowPicker(null);
    if (event.type === 'dismissed' || !date || !showPicker) return;

    setSelectedDate(showPicker, date);
  };

  const setSelectedDate = (target: PickerTarget, date?: Date) => {
    if (!date) return;

    if (target === 'start') {
      setStartDate(date);
      if (dateOnlyTime(date) > dateOnlyTime(endDate)) {
        setEndDate(date);
      }
    } else {
      setEndDate(date);
    }

    setResult(null);
  };

  const restoreHistoryEntry = (entry: HistoryEntry) => {
    setSelectedTagId(entry.tagId);
    setPrincipal(String(entry.principal));
    setRate(String(entry.rate));
    setStartDate(new Date(entry.startDate));
    setEndDate(new Date(entry.endDate));
    setIncludeFirstDay(entry.includeFirstDay);
    setResult(entry.result);
  };

  const deleteHistoryEntry = async (id: string) => {
    await persistHistory(history.filter((entry) => entry.id !== id));
  };

  const clearHistory = () => {
    Alert.alert(t('calculator.alerts.clearHistoryTitle'), t('calculator.alerts.clearHistoryMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('calculator.alerts.deleteAll'),
        style: 'destructive',
        onPress: () => void persistHistory([]),
      },
    ]);
  };

  const changeRetention = async (nextRetention: RetentionOption) => {
    setRetention(nextRetention);
    await AsyncStorage.setItem(RETENTION_KEY, nextRetention);
    await persistHistory(history, nextRetention);
  };

  const renderTag = (item: (typeof INTEREST_TAGS)[number]) => {
    const selected = item.id === selectedTagId;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.85}
        style={[
          styles.tagButton,
          {
            borderColor: selected ? tintColor : colors.border,
            borderWidth: 0.5,
            backgroundColor: selected ? colors.goldSubtle : colors.card,
          },
        ]}
        onPress={() => {
          setSelectedTagId(item.id);
          setResult(null);
        }}
      >
        <Ionicons
          name={item.icon}
          size={13}
          color={selected ? tintColor : colors.subtext}
        />
        <Text style={[
          styles.tagText,
          {
            color: selected ? colors.text : colors.subtext,
            fontFamily: selected ? typography.fonts.bold : typography.fonts.primary,
            opacity: selected ? 1 : 0.75
          }
        ]}>
          {tagLabel(item)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderDateButton = (target: PickerTarget, label: string, date: Date) => {
    if (Platform.OS === 'ios') {
      return (
        <NativeView style={[styles.dateButton, styles.iosDateButton, { backgroundColor: colors.surfaceSoft, borderColor: colors.border, borderWidth: 0.5 }]}>
          <NativeView style={styles.iosDateLabelBlock}>
            <Text style={[styles.label, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>{label}</Text>
          </NativeView>
          <NativeView style={styles.compactPickerBox}>
            <DateTimePicker
              value={date}
              mode="date"
              display="compact"
              accentColor={tintColor}
              themeVariant={isDark ? 'dark' : 'light'}
              onChange={(_, selectedDate) => setSelectedDate(target, selectedDate)}
            />
          </NativeView>
        </NativeView>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.dateButton, { backgroundColor: colors.surfaceSoft, borderColor: colors.border, borderWidth: 0.5 }]}
        onPress={() => setShowPicker(target)}
      >
        <NativeView style={styles.dateTextBlock}>
          <Text style={[styles.label, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>{label}</Text>
          <Text style={[styles.dateValue, { color: colors.text, fontFamily: typography.fonts.bold }]}>{formatDisplayDate(date)}</Text>
        </NativeView>
        <Ionicons name="calendar-outline" size={18} color={tintColor} />
      </TouchableOpacity>
    );
  };

  const renderRetentionOption = (option: (typeof RETENTION_OPTIONS)[number]) => {
    const selected = option.id === retention;

    return (
      <TouchableOpacity
        key={option.id}
        activeOpacity={0.85}
        style={[
          styles.retentionButton,
          {
            borderColor: selected ? tintColor : colors.border,
            borderWidth: 0.5,
            backgroundColor: selected ? tintColor : 'transparent',
          },
        ]}
        onPress={() => void changeRetention(option.id)}
      >
        <Text style={[styles.retentionText, { color: selected ? colors.onAccent : colors.subtext, fontFamily: typography.fonts.bold }]}>
          {t(`calculator.retention.${option.id}`)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <NativeView style={styles.header}>
          <Text style={[styles.eyebrow, { color: tintColor, fontFamily: typography.fonts.bold }]}>
            FINANCIAL JURISPRUDENCE
          </Text>
          <Text style={[styles.title, { color: colors.text, fontFamily: typography.fonts.regal }]}>
            {t('calculator.title')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
            {t('calculator.subtitle')}
          </Text>
        </NativeView>

        <NativeView style={styles.tagSection}>
          <Text style={[styles.sectionLabel, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>
            {t('calculator.contextTags')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagRow}
          >
            {INTEREST_TAGS.map(renderTag)}
          </ScrollView>
        </NativeView>

        <NativeView style={[styles.noticeBox, { borderColor: colors.border, borderWidth: 0.5, backgroundColor: colors.goldSubtle }]}>
          <Ionicons name="information-circle-outline" size={18} color={tintColor} style={{ marginTop: 1 }} />
          <NativeView style={styles.noticeContent}>
            <Text style={[styles.noticeTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>{tagLabel(selectedTag)}</Text>
            <Text style={[styles.noticeText, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{tagNote(selectedTag)}</Text>
          </NativeView>
        </NativeView>

        <NativeView style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 0.5 }]}>
          <NativeView style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>{t('calculator.principal')}</Text>
            <NativeView style={[styles.inputWrapper, { backgroundColor: colors.surfaceSoft, borderColor: principalFocused ? tintColor : colors.border, borderWidth: 0.5 }]}>
              <TextInput
                style={[styles.input, { color: colors.text, fontFamily: typography.fonts.bold }]}
                value={principal}
                onFocus={() => setPrincipalFocused(true)}
                onBlur={() => setPrincipalFocused(false)}
                onChangeText={(value) => {
                  setPrincipal(value);
                  setResult(null);
                }}
                placeholder={t('calculator.principalPlaceholder')}
                placeholderTextColor={colors.subtext + '60'}
                keyboardType="decimal-pad"
              />
            </NativeView>
          </NativeView>

          <NativeView style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>{t('calculator.rate')}</Text>
            <NativeView style={[styles.inputWrapper, { backgroundColor: colors.surfaceSoft, borderColor: rateFocused ? tintColor : colors.border, borderWidth: 0.5 }]}>
              <TextInput
                style={[styles.input, { color: colors.text, fontFamily: typography.fonts.bold }]}
                value={rate}
                onFocus={() => setRateFocused(true)}
                onBlur={() => setRateFocused(false)}
                onChangeText={(value) => {
                  setRate(value);
                  setResult(null);
                }}
                placeholder={t('calculator.ratePlaceholder')}
                placeholderTextColor={colors.subtext + '60'}
                keyboardType="decimal-pad"
              />
            </NativeView>
          </NativeView>

          <NativeView style={styles.dateRow}>
            {renderDateButton('start', t('calculator.startDate'), startDate)}
            {renderDateButton('end', t('calculator.endDate'), endDate)}
          </NativeView>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.toggleRow}
            onPress={() => {
              setIncludeFirstDay((value) => !value);
              setResult(null);
            }}
          >
            <MaterialCommunityIcons
              name={includeFirstDay ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={22}
              color={tintColor}
            />
            <NativeView style={styles.toggleTextBlock}>
              <Text style={[styles.toggleTitle, { color: colors.text, fontFamily: typography.fonts.bold }]}>{t('calculator.includeFirstDay')}</Text>
              <Text style={[styles.toggleHint, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{t('calculator.dayPreview', { count: dayPreview })}</Text>
            </NativeView>
          </TouchableOpacity>

          <NativeView style={styles.buttonRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.calculateButton, { backgroundColor: tintColor }]}
              onPress={calculate}
            >
              <Ionicons name="calculator-outline" size={18} color={colors.onAccent} />
              <Text style={[styles.calculateText, { color: colors.onAccent, fontFamily: typography.fonts.bold }]}>{t('calculator.calculate')}</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} style={[styles.clearButton, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]} onPress={clearForm}>
              <Text style={[styles.clearText, { color: colors.text, fontFamily: typography.fonts.bold }]}>{t('calculator.clearValues')}</Text>
            </TouchableOpacity>
          </NativeView>
        </NativeView>

        {result && (
          <>
            <NativeView
              ref={resultCardRef}
              collapsable={false}
              style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 0.5 }]}
            >
              <NativeView style={[styles.resultInnerFrame, { borderColor: tintColor + '30', borderWidth: 0.5 }]}>
                <NativeView style={styles.resultHeader}>
                  <NativeView style={[styles.emblemContainer, { borderColor: tintColor + '30', backgroundColor: colors.surfaceSoft }]}>
                    <Ionicons name="scale-outline" size={24} color={tintColor} />
                  </NativeView>
                  <Text style={[styles.resultBrandName, { color: colors.text, fontFamily: typography.fonts.regal }]}>LawQuest</Text>
                  <NativeView style={[styles.separator, { backgroundColor: colors.border }]} />
                  <Text style={[styles.resultBrandSubtitle, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>CERTIFIED INTEREST COMPUTATION</Text>
                </NativeView>

                <NativeView style={[styles.contextPill, { borderColor: colors.border, borderWidth: 0.5, backgroundColor: colors.surfaceSoft }]}>
                  <Ionicons name={selectedTag.icon} size={12} color={tintColor} />
                  <Text style={[styles.contextPillText, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                    {t('calculator.tagPrefix', { label: tagLabel(selectedTag) })}
                  </Text>
                </NativeView>

                <NativeView style={styles.highlightResult}>
                  <Text style={[styles.resultLabel, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>{t('calculator.totalInterest')}</Text>
                  <Text style={[styles.interestValue, { color: tintColor, fontFamily: typography.fonts.regal }]}>
                    {bahtFormatter.format(result.interest)} {t('calculator.baht')}
                  </Text>
                </NativeView>

                <NativeView style={styles.breakdownBox}>
                  <NativeView style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.breakdownLabel, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{t('calculator.principalShort')}</Text>
                    <Text style={[styles.breakdownValue, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {bahtFormatter.format(result.principal)} {t('calculator.baht')}
                    </Text>
                  </NativeView>
                  <NativeView style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.breakdownLabel, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{t('calculator.rateShort')}</Text>
                    <Text style={[styles.breakdownValue, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {numberFormatter.format(result.rate)}% {t('calculator.yearly')}
                    </Text>
                  </NativeView>
                  <NativeView style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.breakdownLabel, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{t('calculator.dayCount')}</Text>
                    <Text style={[styles.breakdownValue, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {t('calculator.days', { count: result.days })}
                    </Text>
                  </NativeView>
                  <NativeView style={[styles.breakdownRow, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.breakdownLabel, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{t('calculator.dailyInterest')}</Text>
                    <Text style={[styles.breakdownValue, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {bahtFormatter.format(result.interestPerDay)} {t('calculator.baht')}
                    </Text>
                  </NativeView>
                  <NativeView style={[styles.breakdownRow, { borderBottomWidth: 0 }]}>
                    <Text style={[styles.breakdownLabel, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{t('calculator.total')}</Text>
                    <Text style={[styles.breakdownValue, { color: colors.text, fontFamily: typography.fonts.bold }]}>
                      {bahtFormatter.format(result.total)} {t('calculator.baht')}
                    </Text>
                  </NativeView>
                </NativeView>

                <NativeView style={[styles.formulaBox, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
                  <Text style={[styles.formulaLabel, { color: colors.text, fontFamily: typography.fonts.bold }]}>{t('calculator.assumptions')}</Text>
                  <Text style={[styles.formulaText, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
                    • {t('calculator.dateRange', { start: formatDisplayDate(startDate), end: formatDisplayDate(endDate) })}
                  </Text>
                  <Text style={[styles.formulaText, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>• {t('calculator.yearBase')}</Text>
                  <Text style={[styles.formulaText, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>• {t('calculator.formula', { formula: result.formula })}</Text>
                  <Text style={[styles.formulaText, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>• {t('calculator.tagNote', { note: tagNote(selectedTag) })}</Text>
                </NativeView>

                <Text style={[styles.imageDisclaimer, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{t('calculator.imageDisclaimer')}</Text>
              </NativeView>
            </NativeView>

            <NativeView style={[styles.actionPanel, { backgroundColor: 'transparent' }]}>
              <TouchableOpacity activeOpacity={0.85} style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={copyToClipboard}>
                <Ionicons name="copy-outline" size={17} color={tintColor} />
                <Text style={[styles.actionText, { color: tintColor, fontFamily: typography.fonts.bold }]}>{t('common.copy')}</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={shareResult}>
                <Ionicons name="share-outline" size={17} color={tintColor} />
                <Text style={[styles.actionText, { color: tintColor, fontFamily: typography.fonts.bold }]}>{t('common.share')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.actionButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={saveResultAsImage}
                disabled={isSavingImage}
              >
                <Ionicons name="image-outline" size={17} color={tintColor} />
                <Text style={[styles.actionText, { color: tintColor, fontFamily: typography.fonts.bold }]}>
                  {isSavingImage ? t('calculator.saving') : t('calculator.saveImage')}
                </Text>
              </TouchableOpacity>
            </NativeView>
          </>
        )}

        <NativeView style={styles.historySection}>
          <NativeView style={styles.historyHeader}>
            <NativeView style={styles.historyTitleBlock}>
              <Text style={[styles.historyTitle, { color: colors.text, fontFamily: typography.fonts.regal }]}>{t('calculator.history')}</Text>
              <Text style={[styles.historySubtitle, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{t('calculator.historyHint')}</Text>
            </NativeView>
            {history.length > 0 && (
              <TouchableOpacity activeOpacity={0.8} onPress={clearHistory}>
                <Text style={[styles.clearHistoryText, { color: tintColor, fontFamily: typography.fonts.bold }]}>{t('calculator.clearAll')}</Text>
              </TouchableOpacity>
            )}
          </NativeView>

          <NativeView style={styles.retentionSection}>
            <Text style={[styles.sectionLabel, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>{t('calculator.autoDelete')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.retentionRow}>
              {RETENTION_OPTIONS.map(renderRetentionOption)}
            </ScrollView>
          </NativeView>

          {history.length === 0 ? (
            <NativeView style={[styles.emptyHistory, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 0.5 }]}>
              <Ionicons name="time-outline" size={22} color={colors.subtext} />
              <Text style={[styles.emptyHistoryText, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{t('calculator.emptyHistory')}</Text>
            </NativeView>
          ) : (
            <NativeView style={styles.historyList}>
              {history.map((entry) => {
                const tag = getTag(entry.tagId);
                const createdDate = formatDisplayDate(new Date(entry.createdAt));

                return (
                  <TouchableOpacity
                    key={entry.id}
                    activeOpacity={0.86}
                    style={[styles.historyItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => restoreHistoryEntry(entry)}
                  >
                    <NativeView style={styles.historyItemTop}>
                      <NativeView style={styles.historyItemLabel}>
                        <Ionicons name={tag.icon} size={12} color={tintColor} />
                        <Text style={[styles.historyTag, { color: colors.text, fontFamily: typography.fonts.bold }]}>{tagLabel(tag).toUpperCase()}</Text>
                      </NativeView>
                      <TouchableOpacity hitSlop={10} onPress={() => void deleteHistoryEntry(entry.id)}>
                        <Ionicons name="trash-outline" size={15} color={colors.subtext} style={{ opacity: 0.55 }} />
                      </TouchableOpacity>
                    </NativeView>

                    <NativeView style={styles.historyContent}>
                      <Text style={[styles.historyAmount, { color: tintColor, fontFamily: typography.fonts.regal }]}>
                        {bahtFormatter.format(entry.result.interest)} <Text style={{ fontSize: 13, fontFamily: typography.fonts.bold }}>{t('calculator.baht')}</Text>
                      </Text>
                      <Text style={[styles.historyMeta, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
                        {t('calculator.historyMeta', {
                          principal: bahtFormatter.format(entry.principal),
                          rate: entry.rate,
                          days: entry.result.days,
                        })}
                      </Text>
                    </NativeView>

                    <NativeView style={styles.historyFooter}>
                      <NativeView style={[styles.dateBadge, { backgroundColor: colors.surfaceSoft, borderColor: colors.border }]}>
                        <Text style={[styles.historyDate, { color: colors.subtext, fontFamily: typography.fonts.bold }]}>{createdDate}</Text>
                      </NativeView>
                    </NativeView>
                  </TouchableOpacity>
                );
              })}
            </NativeView>
          )}
        </NativeView>

        <NativeView style={styles.disclaimer}>
          <Text style={[styles.disclaimerText, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>{t('calculator.disclaimer')}</Text>
        </NativeView>

        {Platform.OS !== 'ios' && showPicker && (
          <DateTimePicker
            value={showPicker === 'start' ? startDate : endDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </ScrollView>
      <StatusBar style="auto" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { alignItems: 'center', paddingTop: 10, paddingBottom: 24 },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 4,
    opacity: 0.55,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  title: { fontSize: 32, letterSpacing: -0.3, textAlign: 'center' },
  subtitle: { fontSize: 13, lineHeight: 20, marginTop: 6, opacity: 0.6, textAlign: 'center' },
  tagSection: { marginBottom: 20 },
  tagRow: { gap: 8, paddingRight: 20 },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    marginBottom: 10,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  tagButton: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  tagText: { fontSize: 12.5, letterSpacing: 0.2 },
  noticeBox: {
    alignItems: 'flex-start',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
    padding: 14,
  },
  noticeContent: { flex: 1 },
  noticeTitle: { fontSize: 13.5, marginBottom: 2 },
  noticeText: { fontSize: 12, lineHeight: 17, opacity: 0.75 },
  card: {
    borderRadius: 16,
    marginBottom: 24,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 10, marginBottom: 8, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.55 },
  inputWrapper: {
    borderRadius: 10,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  input: { fontSize: 16, padding: 0 },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  dateButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  iosDateButton: { minHeight: 52, paddingRight: 6 },
  dateTextBlock: { flex: 1 },
  iosDateLabelBlock: { flex: 1, justifyContent: 'center' },
  dateValue: { fontSize: 14.5 },
  compactPickerBox: { alignItems: 'flex-end', minWidth: 95 },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    paddingHorizontal: 2,
  },
  toggleTextBlock: { flex: 1 },
  toggleTitle: { fontSize: 14 },
  toggleHint: { fontSize: 12, marginTop: 1, opacity: 0.55 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  calculateButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    height: 52,
    justifyContent: 'center',
  },
  calculateText: { fontSize: 15.5, letterSpacing: 0.3 },
  clearButton: {
    alignItems: 'center',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  clearText: { fontSize: 14.5, opacity: 0.85 },
  resultCard: {
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  resultInnerFrame: {
    borderRadius: 16,
    margin: 6,
    padding: 18,
    alignItems: 'stretch',
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  emblemContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  resultBrandName: { fontSize: 20, letterSpacing: 0.5 },
  separator: {
    height: 0.5,
    width: 40,
    marginVertical: 10,
    opacity: 0.25,
  },
  resultBrandSubtitle: { fontSize: 9, letterSpacing: 2, opacity: 0.5 },
  contextPill: {
    alignSelf: 'center',
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  contextPillText: { fontSize: 12, letterSpacing: 0.2 },
  highlightResult: { alignItems: 'center', marginBottom: 18 },
  resultLabel: { fontSize: 10, marginBottom: 6, letterSpacing: 1.2, textTransform: 'uppercase', opacity: 0.55 },
  interestValue: { fontSize: 36, textAlign: 'center' },
  breakdownBox: {
    marginBottom: 18,
    padding: 0,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
  },
  breakdownLabel: { flex: 1, fontSize: 13, opacity: 0.65 },
  breakdownValue: { flex: 1, fontSize: 13.5, textAlign: 'right' },
  formulaBox: { borderRadius: 12, borderWidth: 0.5, marginBottom: 12, padding: 14 },
  formulaLabel: { fontSize: 10, marginBottom: 6, letterSpacing: 0.8, textTransform: 'uppercase', opacity: 0.75 },
  formulaText: { fontSize: 11.5, lineHeight: 18, opacity: 0.65, marginBottom: 3 },
  imageDisclaimer: { fontSize: 9.5, lineHeight: 15, textAlign: 'center', marginTop: 10, opacity: 0.4 },
  actionPanel: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 28,
    paddingHorizontal: 2,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 0.5,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    height: 46,
    justifyContent: 'center',
  },
  actionText: { fontSize: 12 },
  historySection: { marginBottom: 20 },
  historyHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  historyTitleBlock: { flex: 1 },
  historyTitle: { fontSize: 22, letterSpacing: -0.2 },
  historySubtitle: { fontSize: 12.5, marginTop: 2, opacity: 0.55 },
  clearHistoryText: { fontSize: 12.5, letterSpacing: 0.3 },
  retentionSection: { marginBottom: 18 },
  retentionRow: { gap: 8, paddingRight: 20 },
  retentionButton: {
    borderRadius: 8,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  retentionText: { fontSize: 11.5, letterSpacing: 0.2 },
  emptyHistory: {
    alignItems: 'center',
    borderRadius: 16,
    gap: 10,
    paddingVertical: 36,
  },
  emptyHistoryText: { fontSize: 14, opacity: 0.55 },
  historyList: { gap: 12 },
  historyItem: {
    borderRadius: 14,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  historyItemTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyItemLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  historyTag: { fontSize: 9.5, letterSpacing: 1.2, opacity: 0.75 },
  historyContent: { marginBottom: 10 },
  historyAmount: { fontSize: 19, marginBottom: 4 },
  historyMeta: { fontSize: 12, lineHeight: 18, opacity: 0.65 },
  historyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    borderWidth: 0.5,
  },
  historyDate: { fontSize: 8.5, letterSpacing: 0.5, textTransform: 'uppercase' },
  disclaimer: { paddingHorizontal: 8, marginBottom: 30 },
  disclaimerText: {
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    opacity: 0.4,
  },
});

