import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { memo, useEffect } from "react";
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

import { Text, View } from "@/components/Themed";
import {
  getSectionTextHighlightParagraphId,
  LegalHighlightRecord,
} from "@/services/highlights";
import {
  LegalReaderSearchIntent,
  LegalReaderSection,
  LegalReaderSectionMetadata,
  normalizeTextForSearch,
  parseSectionDisplayForLanguage,
} from "@/services/legalReaderSelectors";
import { LegalParagraphRecord } from "@/services/legalStorage";
import { toggleSavedSection } from "@/services/savedItems";

type ReaderCopy = {
  highlight: string;
  note: string;
  open: string;
  save: string;
  saved: string;
};

export type ReaderHighlightRequest = {
  paragraphs: Array<{
    paragraphId: string;
    text: string;
  }>;
  sectionId: string;
  sectionNo: string;
  title: string;
  structurePath?: string;
};

type SectionCardProps = {
  authoritative?: boolean;
  borderColor: string;
  cardBg: string;
  codeId: string;
  codeTitle: string;
  isDark: boolean;
  isSaved: boolean;
  isTarget: boolean;
  item: LegalReaderSection;
  highlights: LegalHighlightRecord[];
  language: string;
  metadata?: LegalReaderSectionMetadata;
  noteCount: number;
  onHighlightManage?: (highlight: LegalHighlightRecord) => void;
  onHighlightPress?: (request: ReaderHighlightRequest) => void;
  onNeedHydration?: (sectionId: string) => void;
  onSavedChange: (
    section: {
      codeId: string;
      language: string;
      versionId?: string;
      sectionId: string;
    },
    saved: boolean,
  ) => void;
  paragraphs: LegalParagraphRecord[];
  readerCopy: ReaderCopy;
  reviewStatus?: string | null;
  searchIntent: LegalReaderSearchIntent;
  searchSnippet?: string;
  sourceType?: string | null;
  structureLabelById: Map<string, string>;
  subtextColor: string;
  textColor: string;
  tintColor: string;
  translationStatus?: string | null;
  versionId: string;
};

export const SectionCard = memo(function SectionCard({
  borderColor,
  cardBg,
  authoritative,
  codeId,
  codeTitle,
  isTarget,
  isSaved,
  item,
  highlights,
  language,
  metadata,
  noteCount,
  onHighlightManage,
  onHighlightPress,
  onNeedHydration,
  onSavedChange,
  paragraphs,
  readerCopy,
  searchIntent,
  searchSnippet,
  structureLabelById,
  subtextColor,
  textColor,
  tintColor,
  reviewStatus,
  sourceType,
  translationStatus,
  versionId,
  isDark,
}: SectionCardProps) {
  const structurePath = metadata?.structurePath
    ?.map((nodeId) => structureLabelById.get(nodeId))
    .filter(Boolean)
    .join(" / ");
  const parsedSection = parseSectionDisplayForLanguage(item, language);
  const displayParagraphs = getDisplayParagraphs(item, paragraphs, language);
  const paragraphText = displayParagraphs.map((paragraph) => paragraph.text).join("\n\n");
  const displayText = getDisplayTextForSearch(
    searchSnippet || paragraphText || parsedSection.text,
    searchIntent,
  );
  const shouldRenderParagraphHighlights = !searchSnippet && displayParagraphs.length > 0;
  const fallbackDisplayHighlights =
    !shouldRenderParagraphHighlights && !searchSnippet
      ? getHighlightsForDisplay(
          highlights,
          getSectionTextHighlightParagraphId(item.sectionId),
          displayText,
        )
      : [];

  useEffect(() => {
    if (!item.text.trim()) {
      onNeedHydration?.(item.sectionId);
    }
  }, [item.sectionId, item.text, onNeedHydration]);

  const openSection = () => {
    router.push({
      pathname: "/legal-section",
      params: {
        codeId,
        language,
        versionId,
        sectionId: item.sectionId,
        sectionNo: item.sectionNo,
        sectionTitle: parsedSection.title,
      },
    });
  };

  const toggleSaved = async () => {
    try {
      const result = await toggleSavedSection({
        codeId,
        language,
        versionId,
        authoritative,
        reviewStatus,
        sourceType,
        translationStatus,
        sectionId: item.sectionId,
        sectionNo: item.sectionNo,
        title: parsedSection.title,
        excerpt: parsedSection.text,
        codeTitle,
        structurePath,
      });

      onSavedChange(
        { codeId, language, versionId, sectionId: item.sectionId },
        result.saved,
      );
    } catch (error) {
      console.warn("Failed to toggle saved section", error);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={openSection}
      style={[
        styles.sectionCard,
        {
          backgroundColor: isTarget ? tintColor + "0F" : cardBg,
          borderColor: isTarget ? tintColor : borderColor,
        },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionNoBadge,
            {
              backgroundColor: isDark
                ? "rgba(212,175,55,0.08)"
                : "rgba(212,175,55,0.05)",
              borderColor: tintColor,
            },
          ]}
        >
          <Text style={[styles.sectionNoBadgeText, { color: tintColor }]}>
            {parsedSection.title}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "transparent" }}>
          {item.needsReview && (
            <View style={[styles.reviewBadge, { borderColor: tintColor }]}>
              <Text style={[styles.reviewBadgeText, { color: tintColor }]}>
                REVIEW
              </Text>
            </View>
          )}
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={toggleSaved}
            hitSlop={8}
          >
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={20}
              color={isSaved ? tintColor : subtextColor}
            />
          </TouchableOpacity>
        </View>
      </View>

      {structurePath && (
        <Text
          style={[styles.structurePath, { color: subtextColor }]}
          numberOfLines={1}
        >
          {structurePath}
        </Text>
      )}

      <Text
        style={[styles.sectionText, { color: textColor }]}
        numberOfLines={8}
      >
        {shouldRenderParagraphHighlights ? (
          displayParagraphs.map((paragraph, index) => (
            <Text key={paragraph.paragraphId}>
              <HighlightedText
                highlightColor={tintColor}
                searchIntent={searchIntent}
                text={paragraph.text}
                textColor={textColor}
                onStoredHighlightPress={onHighlightManage}
                storedHighlights={getHighlightsForDisplay(
                  highlights,
                  paragraph.paragraphId,
                  paragraph.text,
                )}
              />
              {index < displayParagraphs.length - 1 ? "\n\n" : ""}
            </Text>
          ))
        ) : (
          <HighlightedText
            highlightColor={tintColor}
            searchIntent={searchIntent}
            text={displayText}
            textColor={textColor}
            onStoredHighlightPress={onHighlightManage}
            storedHighlights={fallbackDisplayHighlights}
          />
        )}
      </Text>

    </TouchableOpacity>
  );
});

function HighlightedText({
  highlightColor,
  onStoredHighlightPress,
  searchIntent,
  storedHighlights = [],
  text,
  textColor,
}: {
  highlightColor: string;
  onStoredHighlightPress?: (highlight: LegalHighlightRecord) => void;
  searchIntent: LegalReaderSearchIntent;
  storedHighlights?: DisplayHighlightRange[];
  text: string;
  textColor: string;
}) {
  if (storedHighlights.length > 0) {
    const segments = splitTextByStoredHighlights(text, storedHighlights);

    return (
      <>
        {segments.map((segment, index) => {
          const storedHighlight = segment.highlight;

          return (
            <Text
              key={`${segment.text}-${index}`}
              style={
                storedHighlight
                  ? {
                      backgroundColor: getHighlightBackground(storedHighlight.color),
                      borderRadius: 4,
                    }
                  : undefined
              }
              onPress={
                storedHighlight
                  ? () => onStoredHighlightPress?.(storedHighlight.record)
                  : undefined
              }
            >
              <SearchHighlightedText
                highlightColor={highlightColor}
                searchIntent={searchIntent}
                text={segment.text}
                textColor={textColor}
              />
            </Text>
          );
        })}
      </>
    );
  }

  return (
    <SearchHighlightedText
      highlightColor={highlightColor}
      searchIntent={searchIntent}
      text={text}
      textColor={textColor}
    />
  );
}

function SearchHighlightedText({
  highlightColor,
  searchIntent,
  text,
  textColor,
}: {
  highlightColor: string;
  searchIntent: LegalReaderSearchIntent;
  text: string;
  textColor: string;
}) {
  const query = searchIntent.normalizedQuery;

  if (searchIntent.type !== "text" || query.length < 2) {
    return <Text style={{ color: textColor }}>{text}</Text>;
  }

  const escapedQuery = escapeRegExp(searchIntent.rawQuery.trim());
  const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));

  return (
    <>
      {parts.map((part, index) => {
        const highlighted =
          normalizeTextForSearch(part) === normalizeTextForSearch(query);

        return (
          <Text
            key={`${part}-${index}`}
            style={{
              color: highlighted ? highlightColor : textColor,
              fontFamily: highlighted ? "Inter-Bold" : "Inter-Regular",
            }}
          >
            {part}
          </Text>
        );
      })}
    </>
  );
}

type DisplayHighlightRange = {
  color: LegalHighlightRecord["color"];
  endOffset: number;
  record: LegalHighlightRecord;
  startOffset: number;
};

function getHighlightsForDisplay(
  highlights: LegalHighlightRecord[],
  paragraphId: string,
  text: string,
): DisplayHighlightRange[] {
  return highlights
    .filter(
      (highlight) =>
        highlight.target.paragraphId === paragraphId &&
        highlight.target.startOffset < text.length &&
        highlight.target.endOffset > 0,
    )
    .map((highlight) => ({
      color: highlight.color,
      record: highlight,
      startOffset: Math.max(0, highlight.target.startOffset),
      endOffset: Math.min(text.length, highlight.target.endOffset),
    }))
    .filter((highlight) => highlight.endOffset > highlight.startOffset)
    .sort((left, right) => left.startOffset - right.startOffset);
}

function splitTextByStoredHighlights(
  text: string,
  highlights: DisplayHighlightRange[],
) {
  const segments: Array<{
    highlight?: DisplayHighlightRange;
    text: string;
  }> = [];
  let cursor = 0;

  highlights.forEach((highlight) => {
    const startOffset = Math.max(cursor, highlight.startOffset);
    const endOffset = Math.max(startOffset, highlight.endOffset);

    if (startOffset > cursor) {
      segments.push({ text: text.slice(cursor, startOffset) });
    }

    if (endOffset > startOffset) {
      segments.push({
        highlight,
        text: text.slice(startOffset, endOffset),
      });
      cursor = endOffset;
    }
  });

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return segments;
}

function getHighlightBackground(color: LegalHighlightRecord["color"]) {
  switch (color) {
    case "blue":
      return "rgba(96,165,250,0.28)";
    case "green":
      return "rgba(74,222,128,0.26)";
    case "pink":
      return "rgba(244,114,182,0.25)";
    case "purple":
      return "rgba(168,85,247,0.24)";
    case "yellow":
    default:
      return "rgba(250,204,21,0.32)";
  }
}

function getDisplayTextForSearch(
  text: string,
  searchIntent: LegalReaderSearchIntent,
) {
  if (searchIntent.type !== "text" || searchIntent.normalizedQuery.length < 2) {
    return text;
  }

  const normalizedText = normalizeTextForSearch(text);
  const matchIndex = normalizedText.indexOf(searchIntent.normalizedQuery);

  if (matchIndex < 0 || text.length <= 260) {
    return text;
  }

  const start = Math.max(0, matchIndex - 90);
  const end = Math.min(
    text.length,
    matchIndex + searchIntent.rawQuery.length + 180,
  );
  const prefix = start > 0 ? "... " : "";
  const suffix = end < text.length ? " ..." : "";

  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

function getDisplayParagraphs(
  section: LegalReaderSection,
  paragraphs: LegalParagraphRecord[],
  language: string,
) {
  if (paragraphs.length === 0) {
    const parsedSection = parseSectionDisplayForLanguage(section, language);

    return parsedSection.text.trim()
      ? [
          {
            paragraphId: getSectionTextHighlightParagraphId(section.sectionId),
            text: parsedSection.text,
          },
        ]
      : [];
  }

  return paragraphs
    .map((paragraph, index) => {
      if (index > 0) {
        return {
          paragraphId: paragraph.paragraphId,
          text: paragraph.text,
        };
      }

      return {
        paragraphId: paragraph.paragraphId,
        text: parseSectionDisplayForLanguage(
          {
            ...section,
            text: paragraph.text,
          },
          language,
        ).text,
      };
    })
    .filter((paragraph) => paragraph.text.trim().length > 0);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const styles = StyleSheet.create({
  sectionCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 16,
  },
  sectionNoBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  sectionNoBadgeText: {
    fontSize: 14,
    fontFamily: "Cormorant-Bold",
    letterSpacing: 0.5,
  },
  structurePath: {
    marginBottom: 10,
    fontSize: 11,
    fontFamily: "Inter-SemiBold",
    opacity: 0.4,
  },
  sectionText: {
    fontSize: 17,
    lineHeight: 28,
    fontFamily: "Inter-Regular",
    letterSpacing: -0.1,
  },

  reviewBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reviewBadgeText: {
    fontSize: 9,
    fontFamily: "Inter-Bold",
    letterSpacing: 0.5,
  },
});
