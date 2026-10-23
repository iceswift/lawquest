import { useAppTheme } from "@/context/ThemeContext";
import React from "react";
import { Platform, StyleSheet, View, ViewProps } from "react-native";

interface PremiumCardProps extends ViewProps {
  children: React.ReactNode;
  variant?: "elevated" | "outlined" | "glass" | "leather";
}

export function PremiumCard({
  children,
  style,
  variant, // Kept for interface compatibility but ignored
  ...props
}: PremiumCardProps) {
  const { isDark } = useAppTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: isDark ? "#1E2330" : "#FFFFFF",
          borderColor: isDark ? "rgba(212, 175, 55, 0.25)" : "rgba(184, 150, 76, 0.3)",
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 24,
    borderWidth: 0.5,
    padding: 20,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 18,
      },
      android: {
        elevation: 3,
      },
    }),
  },
});
