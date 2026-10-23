import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Platform, StyleSheet, TouchableOpacity } from "react-native";
import { DraggableGrid } from "react-native-draggable-grid";

import { Text, View } from "@/components/Themed";
import { HomeShortcutItem } from "@/services/homeShortcuts";

interface ShortcutsGridProps {
  borderColor: string;
  cardBg: string;
  data: HomeShortcutItem[];
  isDark: boolean;
  isEditMode: boolean;
  onDataChange: (data: HomeShortcutItem[]) => void;
  onEditModeChange: (isEditMode: boolean) => void;
  onShortcutPress: (item: HomeShortcutItem) => void;
  textColor: string;
  tintColor: string;
}

export function ShortcutsGrid({
  borderColor,
  cardBg,
  data,
  isDark,
  isEditMode,
  onDataChange,
  onEditModeChange,
  onShortcutPress,
  textColor,
  tintColor,
}: ShortcutsGridProps) {
  const { t } = useTranslation();
  const jiggleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isEditMode) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(jiggleAnim, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(jiggleAnim, {
            toValue: -1,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(jiggleAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      jiggleAnim.setValue(0);
    }
  }, [isEditMode, jiggleAnim]);

  const rotation = jiggleAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ["-1deg", "1deg"],
  });

  const renderItem = (item: HomeShortcutItem) => {
    return (
      <Animated.View
        key={item.key}
        style={[
          styles.shortcutItem,
          isEditMode && { transform: [{ rotate: rotation }] },
        ]}
      >
        <View
          style={[
            styles.iconCard,
            {
              backgroundColor: isDark ? "#1C1E22" : "#FFFFFF",
              borderColor: isDark
                ? "rgba(212, 175, 55, 0.15)"
                : "rgba(212, 175, 55, 0.1)",
            },
          ]}
        >
          <FontAwesome5 name={item.icon} size={20} color={tintColor} />
        </View>
        <Text
          style={[styles.shortcutLabel, { color: textColor }]}
          numberOfLines={1}
        >
          {t(item.labelKey)}
        </Text>

        {isEditMode && (
          <View
            style={[
              styles.deleteBadge,
              {
                borderColor: isDark ? "#1C1E22" : "#FFFFFF",
                backgroundColor: "#AF2B2D", // Slightly more premium red
              },
            ]}
          >
            <Ionicons name="close" size={12} color="white" />
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <>
      <View style={styles.gridContainer}>
        <DraggableGrid
          numColumns={4}
          renderItem={renderItem}
          data={data}
          onDragRelease={(newData) =>
            onDataChange(newData as HomeShortcutItem[])
          }
          onItemPress={(item) => {
            if (isEditMode) {
              onEditModeChange(false);
              return;
            }
            onShortcutPress(item as HomeShortcutItem);
          }}
          onResetSort={(newData: HomeShortcutItem[]) => onDataChange(newData)}
          onDragStart={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onEditModeChange(true);
          }}
          style={styles.draggableGrid}
          itemHeight={100}
        />
      </View>

      {isEditMode && (
        <TouchableOpacity
          style={[
            styles.doneButtonWrapper,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.03)"
                : "rgba(0,0,0,0.03)",
            },
          ]}
          onPress={() => onEditModeChange(false)}
          activeOpacity={0.8}
        >
          <BlurView
            intensity={isDark ? 30 : 50}
            tint={isDark ? "dark" : "light"}
            style={[styles.doneButton, { borderColor: tintColor + "66" }]}
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={tintColor}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.doneButtonText, { color: textColor }]}>
              {t("common.done").toUpperCase()}
            </Text>
          </BlurView>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    width: "100%",
    paddingHorizontal: 12,
    minHeight: 220,
    backgroundColor: "transparent",
    marginBottom: 20,
  },
  draggableGrid: {
    backgroundColor: "transparent",
  },
  shortcutItem: {
    width: 75,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconCard: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  shortcutLabel: {
    fontSize: 11,
    fontFamily: "Inter-Medium",
    textAlign: "center",
  },
  deleteBadge: {
    position: "absolute",
    top: -2,
    left: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    zIndex: 10,
  },
  doneButtonWrapper: {
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 25,
  },
  doneButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    overflow: "hidden",
  },
  doneButtonText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
