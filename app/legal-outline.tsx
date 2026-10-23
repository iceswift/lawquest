import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FlashList } from "@shopify/flash-list";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
} from "react-native";

import { Text, View } from "@/components/Themed";
import Colors from "@/constants/Colors";
import { useAppTheme } from "@/context/ThemeContext";
import {
    LegalPackageDocument,
    readLegalReaderIndexPackage,
} from "@/services/legalStorage";

type StructureNode = NonNullable<
  NonNullable<LegalPackageDocument["structure"]>["nodes"]
>[number];
const OUTLINE_SELECTION_KEY_PREFIX = "@lawquest_reader_outline_selection:";

export default function LegalOutlineScreen() {
  const {
    codeId,
    language = "th",
    versionId,
    structureNodeId,
  } = useLocalSearchParams<{
    codeId: string;
    language?: string;
    versionId?: string;
    structureNodeId?: string;
  }>();
  
  const { isDark, tintColor, colors, typography, layout } = useAppTheme();
  
  const [legalPackage, setLegalPackage] = useState<LegalPackageDocument | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);

  const selectedNodeId = structureNodeId ? String(structureNodeId) : null;
  const selectedLanguage = String(language);
  const selectedVersionId =
    legalPackage?.version.versionId ?? (versionId ? String(versionId) : "current");
  
  const selectionKey = `${OUTLINE_SELECTION_KEY_PREFIX}${String(codeId)}:${selectedLanguage}:${selectedVersionId}`;
  const readerCopy = getOutlineCopy(selectedLanguage);
  
  const textColor = colors.text;
  const subtextColor = colors.subtext;
  const cardBg = colors.card;
  const borderColor = colors.border;
  const pageBg = colors.background;

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    readLegalReaderIndexPackage({ codeId: String(codeId), language: selectedLanguage })
      .then((nextPackage) => {
        if (mounted) {
          setLegalPackage(nextPackage);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error("Failed to load outline package", error);
        if (mounted) {
          setLegalPackage(null);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [codeId, selectedLanguage]);

  const nodes = useMemo(
    () => legalPackage?.structure?.nodes ?? [],
    [legalPackage],
  );
  const nodeById = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const currentNode = currentParentId
    ? (nodeById.get(currentParentId) ?? null)
    : null;
  const currentChildren = useMemo(() => {
    return nodes
      .filter((node) => (node.parentId ?? null) === currentParentId)
      .sort((a, b) => compareStructureNode(a, b, selectedLanguage));
  }, [currentParentId, nodes, selectedLanguage]);
  const childCountById = useMemo(() => {
    const counts = new Map<string, number>();

    nodes.forEach((node) => {
      if (!node.parentId) {
        return;
      }

      counts.set(node.parentId, (counts.get(node.parentId) ?? 0) + 1);
    });

    return counts;
  }, [nodes]);
  const currentPath =
    currentNode?.path
      ?.map((nodeId) => nodeById.get(nodeId))
      .filter((node): node is StructureNode => Boolean(node)) ?? [];
  const allSectionCount = useMemo(() => countUniqueSections(nodes), [nodes]);

  useEffect(() => {
    if (nodes.length === 0) {
      return;
    }

    setCurrentParentId(
      selectedNodeId ? (nodeById.get(selectedNodeId)?.parentId ?? null) : null,
    );
  }, [nodeById, nodes.length, selectedNodeId]);

  const applySelection = async (nodeId: string | null) => {
    try {
      await AsyncStorage.setItem(selectionKey, nodeId ?? "__all__");
    } catch (error) {
      console.warn("Failed to store outline selection", error);
    }

    router.back();
  };

  const goBackLevel = () => {
    if (!currentNode) {
      router.back();
      return;
    }

    setCurrentParentId(currentNode.parentId ?? null);
  };

  return (
    <View style={[styles.container, { backgroundColor: pageBg }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={tintColor} size="large" />
          <Text style={[styles.centerText, { color: subtextColor, fontFamily: typography.fonts.primary }]}>
            {readerCopy.loading}
          </Text>
        </View>
      ) : !legalPackage ? (
        <View style={styles.centerState}>
          <Ionicons name="file-tray-outline" size={38} color={subtextColor} style={{ opacity: 0.5 }} />
          <Text style={[styles.centerText, { color: subtextColor, fontFamily: typography.fonts.primary }]}>
            {readerCopy.packageNotFound}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Centered Modal Header */}
          <View style={styles.header}>
            <Text style={[styles.eyebrow, { color: tintColor, fontFamily: typography.fonts.bold }]}>
              {readerCopy.eyebrow}
            </Text>
            <Text style={[styles.title, { color: textColor, fontFamily: typography.fonts.regal }]} numberOfLines={2}>
              {currentNode
                ? getStructureNodeLabel(currentNode, selectedLanguage)
                : readerCopy.title}
            </Text>
            <Text style={[styles.subtitle, { color: subtextColor, fontFamily: typography.fonts.primary }]}>
              {selectedLanguage === "th" 
                ? "จัดระเบียบหมวดหมู่โครงสร้างสารบัญมาตรา" 
                : "Bilingual legal structure navigator"}
            </Text>
          </View>

          {/* Breadcrumbs Section */}
          <View style={styles.breadcrumbRow}>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={goBackLevel}
              style={[
                styles.backChip,
                { 
                  backgroundColor: colors.surfaceSoft, 
                  borderColor: colors.goldSubtle,
                  borderWidth: 1,
                },
              ]}
            >
              <Ionicons name="chevron-back" size={13} color={tintColor} />
              <Text style={[styles.backChipText, { color: textColor, fontFamily: typography.fonts.bold }]}>
                {currentNode ? readerCopy.back : readerCopy.reader}
              </Text>
            </TouchableOpacity>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.breadcrumbs}
            >
              <TouchableOpacity activeOpacity={0.7} onPress={() => setCurrentParentId(null)}>
                <Text style={[styles.breadcrumbText, { color: !currentNode ? tintColor : subtextColor, fontFamily: !currentNode ? typography.fonts.bold : typography.fonts.primary }]}>
                  {readerCopy.allSections}
                </Text>
              </TouchableOpacity>
              
              {currentPath.map((node, index) => {
                const isLast = index === currentPath.length - 1;
                return (
                  <View key={node.id} style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="chevron-forward" size={10} color={subtextColor} style={{ marginHorizontal: 4, opacity: 0.5 }} />
                    <TouchableOpacity activeOpacity={0.7} onPress={() => setCurrentParentId(node.id)}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.breadcrumbText,
                          {
                            color: isLast ? tintColor : subtextColor,
                            fontFamily: isLast ? typography.fonts.bold : typography.fonts.primary,
                          },
                        ]}
                      >
                        {getStructureNodeLabel(node, selectedLanguage)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>
          </View>

          {/* Streamlined Selection Card */}
          {!currentNode ? (
            <OutlineCard
              count={allSectionCount}
              icon="reader-outline"
              label={readerCopy.allSections}
              meta={readerCopy.sectionCount(allSectionCount)}
              onPress={() => applySelection(null)}
              selected={selectedNodeId === null}
            />
          ) : (
            <OutlineCard
              count={
                currentNode.sectionRange?.sectionCount ??
                currentNode.sectionIds.length
              }
              icon="filter-outline"
              label={readerCopy.showThisHeading}
              meta={[
                formatSectionRange(currentNode, readerCopy),
                readerCopy.sectionCount(
                  currentNode.sectionRange?.sectionCount ??
                    currentNode.sectionIds.length,
                ),
              ]
                .filter(Boolean)
                .join(" · ")}
              onPress={() => applySelection(currentNode.id)}
              selected={selectedNodeId === currentNode.id}
            />
          )}

          {/* Group Header Label */}
          <Text style={[styles.groupLabel, { color: subtextColor, fontFamily: typography.fonts.bold }]}>
            {currentNode ? readerCopy.subHeadings : readerCopy.topHeadings}
          </Text>

          {/* Subheadings List Card */}
          <View
            style={[
              styles.listCard, 
              { 
                backgroundColor: cardBg, 
              }
            ]}
          >
            <FlashList
              data={currentChildren}
              scrollEnabled={false}
              keyExtractor={(node) => node.id}
              style={styles.listCardFlashList}
              renderItem={({ item, index }) => {
                const childCount = childCountById.get(item.id) ?? 0;
                const sectionCount =
                  item.sectionRange?.sectionCount ?? item.sectionIds.length;

                return (
                  <OutlineListItem
                    divider={index < currentChildren.length - 1}
                    dividerColor={colors.goldSubtle}
                    hasChildren={childCount > 0}
                    label={getStructureNodeLabel(item, selectedLanguage)}
                    meta={[
                      formatSectionRange(item, readerCopy),
                      readerCopy.sectionCount(sectionCount),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    onPress={() => {
                      if (childCount > 0) {
                        setCurrentParentId(item.id);
                        return;
                      }

                      applySelection(item.id);
                    }}
                    selected={selectedNodeId === item.id}
                  />
                );
              }}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function OutlineCard({
  icon,
  label,
  meta,
  onPress,
  selected,
  count,
}: {
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  meta: string;
  onPress: () => void;
  selected: boolean;
}) {
  const { colors, typography, tintColor, isDark } = useAppTheme();
  
  // Custom premium executive background style when selected or accent
  const cardBgColor = selected 
    ? (isDark ? "rgba(229, 193, 88, 0.12)" : "rgba(184, 150, 76, 0.08)") 
    : colors.card;
    
  const cardBorderColor = selected ? tintColor : colors.goldSubtle;

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={onPress}
      style={[
        styles.featureCard,
        {
          backgroundColor: cardBgColor,
          borderColor: cardBorderColor,
          borderWidth: selected ? 1.5 : 1,
        },
      ]}
    >
      <View 
        style={[
          styles.featureIcon, 
          { 
            backgroundColor: selected ? tintColor : colors.surfaceSoft,
            borderColor: selected ? tintColor : colors.goldSubtle,
            borderWidth: 1,
          }
        ]}
      >
        <Ionicons name={icon} size={16} color={selected ? "#FFFFFF" : tintColor} />
      </View>
      <View style={styles.itemText}>
        <Text
          style={[
            styles.featureTitle,
            { 
              color: selected ? tintColor : colors.text,
              fontFamily: typography.fonts.bold,
            },
          ]}
        >
          {label}
        </Text>
        <Text style={[styles.itemMeta, { color: colors.subtext, fontFamily: typography.fonts.primary }]}>
          {meta}
        </Text>
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={20} color={tintColor} />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
      )}
    </TouchableOpacity>
  );
}

function OutlineListItem({
  divider,
  dividerColor,
  hasChildren,
  label,
  meta,
  onPress,
  selected,
}: {
  divider: boolean;
  dividerColor: string;
  hasChildren: boolean;
  label: string;
  meta: string;
  onPress: () => void;
  selected: boolean;
}) {
  const { colors, typography, tintColor } = useAppTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      style={[
        styles.listItem,
        divider && {
          borderBottomColor: dividerColor,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View
        style={[
          styles.listIcon,
          { 
            backgroundColor: selected ? tintColor : colors.surfaceSoft,
            borderColor: selected ? tintColor : colors.goldSubtle,
            borderWidth: 1,
          },
        ]}
      >
        <Ionicons
          name={hasChildren ? "folder-outline" : "document-text-outline"}
          size={15}
          color={selected ? "#FFFFFF" : tintColor}
        />
      </View>
      <View style={styles.itemText}>
        <Text
          style={[
            styles.itemTitle,
            { 
              color: selected ? tintColor : colors.text,
              fontFamily: typography.fonts.bold,
            },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
        <Text
          style={[styles.itemMeta, { color: colors.subtext, fontFamily: typography.fonts.primary }]}
          numberOfLines={1}
        >
          {meta}
        </Text>
      </View>
      {hasChildren ? (
        <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
      ) : selected ? (
        <Ionicons name="checkmark-circle" size={18} color={tintColor} />
      ) : null}
    </TouchableOpacity>
  );
}

function getStructureNodeLabel(node: StructureNode, language: string) {
  return node.labels?.[language] ?? node.labels?.th ?? node.label;
}

function compareStructureNode(
  a: StructureNode,
  b: StructureNode,
  language: string,
) {
  const aFirstSection = Number(
    a.sectionRange?.fromSectionNo?.split("/")[0] ?? 0,
  );
  const bFirstSection = Number(
    b.sectionRange?.fromSectionNo?.split("/")[0] ?? 0,
  );

  return (
    aFirstSection - bFirstSection ||
    getStructureNodeLabel(a, language).localeCompare(
      getStructureNodeLabel(b, language),
    )
  );
}

function countUniqueSections(nodes: StructureNode[]) {
  const sectionIds = new Set<string>();

  nodes.forEach((node) => {
    node.sectionIds.forEach((sectionId) => sectionIds.add(sectionId));
  });

  return sectionIds.size;
}

function formatSectionRange(
  node: StructureNode,
  copy: ReturnType<typeof getOutlineCopy>,
) {
  const range = node.sectionRange;

  if (!range?.fromSectionNo) {
    return undefined;
  }

  if (range.fromSectionNo === range.toSectionNo || !range.toSectionNo) {
    return `${copy.sectionRangePrefix} ${range.fromSectionNo}`;
  }

  return `${copy.sectionRangePrefix} ${range.fromSectionNo}-${range.toSectionNo}`;
}

function getOutlineCopy(language: string) {
  if (language === "th") {
    return {
      allSections: "\u0E17\u0E38\u0E01\u0E21\u0E32\u0E15\u0E23\u0E32",
      back: "\u0E01\u0E25\u0E31\u0E1A",
      eyebrow: "LAWQUEST OUTLINE",
      loading:
        "\u0E01\u0E33\u0E25\u0E31\u0E07\u0E42\u0E2B\u0E25\u0E14\u0E2A\u0E32\u0E23\u0E1A\u0E31\u0E0D...",
      packageNotFound:
        "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E1E\u0E47\u0E01\u0E40\u0E01\u0E08",
      reader: "\u0E01\u0E25\u0E31\u0E1A Reader",
      sectionRangePrefix: "\u0E21\u0E32\u0E15\u0E23\u0E32",
      sectionCount: (count: number) =>
        `${count.toLocaleString()} \u0E21\u0E32\u0E15\u0E23\u0E32`,
      showThisHeading:
        "\u0E41\u0E2A\u0E14\u0E07\u0E21\u0E32\u0E15\u0E23\u0E32\u0E43\u0E19\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D\u0E19\u0E35\u0E49",
      subHeadings:
        "\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D\u0E22\u0E48\u0E2D\u0E22",
      title:
        "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D\u0E17\u0E35\u0E48\u0E08\u0E30\u0E2D\u0E48\u0E32\u0E19",
      topHeadings:
        "\u0E42\u0E04\u0E23\u0E07\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E2B\u0E25\u0E31\u0E01",
    };
  }

  return {
    allSections: "All sections",
    back: "Back",
    eyebrow: "LAWQUEST OUTLINE",
    loading: "Loading outline...",
    packageNotFound: "Package not found",
    reader: "Back to Reader",
    sectionRangePrefix: "Section",
    sectionCount: (count: number) => `${count.toLocaleString()} sections`,
    showThisHeading: "Show sections in this heading",
    subHeadings: "Subheadings",
    title: "Choose a heading",
    topHeadings: "Main structure",
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 32,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2.5,
    marginBottom: 4,
    textTransform: "uppercase",
    opacity: 0.5,
  },
  title: {
    fontSize: 34,
    letterSpacing: -0.5,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 6,
    opacity: 0.5,
    textAlign: "center",
  },
  centerState: {
    alignItems: "center",
    backgroundColor: "transparent",
    flex: 1,
    gap: 16,
    justifyContent: "center",
  },
  centerText: {
    fontSize: 14,
    letterSpacing: 0.2,
    opacity: 0.6,
  },
  content: {
    paddingBottom: 48,
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  breadcrumbRow: {
    alignItems: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  backChip: {
    alignItems: "center",
    borderRadius: 20,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.02,
        shadowRadius: 5,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  backChipText: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  breadcrumbs: {
    alignItems: "center",
    gap: 6,
    paddingRight: 24,
  },
  breadcrumbText: {
    fontSize: 11,
    maxWidth: 220,
    opacity: 0.5,
  },
  featureCard: {
    alignItems: "center",
    borderRadius: 24,
    flexDirection: "row",
    marginBottom: 12,
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 14,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  featureIcon: {
    alignItems: "center",
    borderRadius: 14,
    height: 40,
    justifyContent: "center",
    marginRight: 14,
    width: 40,
  },
  featureTitle: {
    fontSize: 15,
    letterSpacing: 0.1,
  },
  groupLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    marginBottom: 12,
    marginTop: 20,
    textTransform: "uppercase",
    opacity: 0.5,
  },
  listCard: {
            borderRadius: 24,
            overflow: "hidden",
            ...Platform.select({
              ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.03,
                shadowRadius: 8,
              },
              android: {
                elevation: 2,
              },
            }),
          },
          listCardFlashList: {
            backgroundColor: "transparent",
            paddingVertical: 4,
          },
  listItem: {
    alignItems: "center",
    flexDirection: "row",
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  listIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 38,
    justifyContent: "center",
    marginRight: 14,
    width: 38,
  },
  itemText: {
    backgroundColor: "transparent",
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 14,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  itemMeta: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.5,
  },
});
