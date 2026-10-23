import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  View as RNView,
} from "react-native";
import { BlurView } from "expo-blur";

import { Text, View } from "@/components/Themed";

type ReaderLoadingCopy = {
  loadingIndex: string;
  loadingNotes: string;
  loadingPackage: string;
  loadingSubtitle: string;
  loadingTitle: string;
};

type ReaderLoadingStateProps = {
  borderColor: string;
  cardBg: string;
  isDark: boolean;
  readerCopy: ReaderLoadingCopy;
  subtextColor: string;
  textColor: string;
  tintColor: string;
};

export function ReaderLoadingState({
  borderColor,
  cardBg,
  isDark,
  readerCopy,
  subtextColor,
  textColor,
  tintColor,
}: ReaderLoadingStateProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const pulseStyle = {
    opacity: pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.54, 1],
    }),
  };

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 720,
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 720,
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const spin = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"] // Subtle rocking/spinning
  });

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.loadingContent}
        showsVerticalScrollIndicator={false}
        style={styles.loadingScroll}
        scrollEnabled={false}
      >
        {Array.from({ length: 5 }).map((_, index) => (
          <Animated.View key={index} style={pulseStyle}>
            <ReaderSkeletonCard
              borderColor={borderColor}
              cardBg={cardBg}
              isDark={isDark}
              tintColor={tintColor}
            />
          </Animated.View>
        ))}
      </ScrollView>

      {/* Floating Pill Status */}
      <RNView style={styles.floatingPillContainer}>
        <BlurView
          intensity={isDark ? 60 : 80}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.floatingPill,
            { 
              borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
              backgroundColor: isDark ? "rgba(20,25,35,0.6)" : "rgba(255,255,255,0.7)"
            },
          ]}
        >
          <RNView style={styles.pillHeader}>
            <Animated.View 
              style={[
                styles.spinnerRing, 
                { borderTopColor: tintColor, transform: [{ rotate: spin }] }
              ]} 
            />
            <Text style={[styles.pillTitle, { color: textColor }]}>
              {readerCopy.loadingTitle}...
            </Text>
          </RNView>
          <Animated.View style={pulseStyle}>
            <Text style={[styles.pillSubtitle, { color: subtextColor }]}>
              {readerCopy.loadingPackage} · {readerCopy.loadingIndex} · {readerCopy.loadingNotes}
            </Text>
          </Animated.View>
        </BlurView>
      </RNView>
    </View>
  );
}

function ReaderSkeletonCard({
  borderColor,
  cardBg,
  isDark,
  tintColor,
}: {
  borderColor: string;
  cardBg: string;
  isDark: boolean;
  tintColor: string;
}) {
  const skeletonPrimary = isDark
    ? "rgba(255,255,255,0.09)"
    : "rgba(0,0,0,0.06)";
  const skeletonSecondary = isDark
    ? "rgba(255,255,255,0.06)"
    : "rgba(0,0,0,0.04)";

  return (
    <View
      style={[
        styles.sectionCard,
        {
          backgroundColor: isDark ? "#1E2330" : "#FFFFFF",
          borderColor: isDark ? "rgba(212, 175, 55, 0.25)" : "rgba(184, 150, 76, 0.3)",
        },
      ]}
    >
      <View style={styles.skeletonHeaderRow}>
        <View style={styles.skeletonBadgeGroup}>
          <View
            style={[
              styles.skeletonBadge,
              { backgroundColor: tintColor + "18" },
            ]}
          />
          <View
            style={[
              styles.skeletonMiniBadge,
              { backgroundColor: skeletonSecondary },
            ]}
          />
        </View>
        <View
          style={[
            styles.skeletonMiniBadge,
            { backgroundColor: skeletonSecondary, width: 52 },
          ]}
        />
      </View>

      <View style={styles.skeletonBody}>
        <View
          style={[
            styles.skeletonLine,
            { width: "92%", backgroundColor: skeletonPrimary },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { width: "78%", backgroundColor: skeletonPrimary },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { width: "100%", backgroundColor: skeletonSecondary },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { width: "86%", backgroundColor: skeletonSecondary },
          ]}
        />
      </View>

      <View style={[styles.skeletonFooter, { borderTopColor: borderColor }]}>
        <View
          style={[
            styles.skeletonFooterItem,
            { backgroundColor: skeletonSecondary },
          ]}
        />
        <View
          style={[
            styles.skeletonFooterItem,
            { backgroundColor: skeletonSecondary, width: 64 },
          ]}
        />
        <View
          style={[
            styles.skeletonFooterItem,
            { backgroundColor: skeletonSecondary, width: 72 },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  loadingScroll: {
    flex: 1,
  },
  loadingContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  floatingPillContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  floatingPill: {
    borderRadius: 32,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 14,
    overflow: "hidden",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  pillHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  spinnerRing: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  pillTitle: {
    fontFamily: "Inter-SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  pillSubtitle: {
    fontFamily: "Inter-Medium",
    fontSize: 11,
    opacity: 0.6,
  },
  sectionCard: {
    borderRadius: 24,
    borderWidth: 0.5,
    marginBottom: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  skeletonHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  skeletonBadgeGroup: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  skeletonBadge: {
    borderRadius: 10,
    height: 28,
    width: 84,
  },
  skeletonMiniBadge: {
    borderRadius: 9,
    height: 18,
    width: 38,
  },
  skeletonBody: {
    gap: 10,
  },
  skeletonLine: {
    borderRadius: 6,
    height: 12,
  },
  skeletonFooter: {
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    paddingTop: 14,
  },
  skeletonFooterItem: {
    borderRadius: 8,
    height: 16,
    width: 48,
  },
});
