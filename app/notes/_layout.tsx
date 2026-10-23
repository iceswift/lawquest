import { Stack } from "expo-router";
import { useAppTheme } from "@/context/ThemeContext";

export default function NotesLayout() {
  const { isDark, tintColor, colors, typography } = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: tintColor,
        headerTitleStyle: { 
          fontFamily: typography.fonts.bold,
          fontSize: 17,
        },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false, // We will build a custom header like before
        }} 
      />
      <Stack.Screen 
        name="[folderId]" 
        options={{
          headerTitle: "", // Will dynamically update based on folderId
        }} 
      />
    </Stack>
  );
}
