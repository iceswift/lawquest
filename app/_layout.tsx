import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider,
} from "@react-navigation/native";
import { 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_600SemiBold, 
  Inter_700Bold 
} from "@expo-google-fonts/inter";
import { 
  CormorantGaramond_400Regular, 
  CormorantGaramond_500Medium, 
  CormorantGaramond_600SemiBold, 
  CormorantGaramond_700Bold,
  CormorantGaramond_700Bold_Italic
} from "@expo-google-fonts/cormorant-garamond";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import Colors from "../constants/Colors";
import "../constants/i18n";
import { AuthProvider } from "../context/AuthContext";
import {
    ThemeProvider as AppThemeProvider,
    useAppTheme,
} from "../context/ThemeContext";

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
let splashScreenPrevented = false;
let splashScreenHidden = false;

void (async () => {
  try {
    const prevented = await SplashScreen.preventAutoHideAsync();
    splashScreenPrevented = prevented;
  } catch (e) {
    /* Prevent crash on hot reload / transient state */
  }
})();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
    "Inter-Regular": Inter_400Regular,
    "Inter-Medium": Inter_500Medium,
    "Inter-SemiBold": Inter_600SemiBold,
    "Inter-Bold": Inter_700Bold,
    "Cormorant-Regular": CormorantGaramond_400Regular,
    "Cormorant-Medium": CormorantGaramond_500Medium,
    "Cormorant-SemiBold": CormorantGaramond_600SemiBold,
    "Cormorant-Bold": CormorantGaramond_700Bold,
    "Cormorant-BoldItalic": CormorantGaramond_700Bold_Italic,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && splashScreenPrevented && !splashScreenHidden) {
      splashScreenHidden = true;
      void SplashScreen.hideAsync().catch(() => {
        splashScreenHidden = false;
        splashScreenPrevented = false;
        /* Prevent crash if splash screen was not registered or already hidden */
      });
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const { isDark, tintColor } = useAppTheme();
  const { t } = useTranslation();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: isDark
              ? Colors.dark.background
              : Colors.light.background,
          },
          headerTintColor: tintColor,
          headerTitleAlign: "center",
          headerTitleStyle: { fontWeight: "700" },
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="country"
          options={{
            presentation: "modal",
            title: t("routes.country"),
            headerTitle: "",
          }}
        />
        <Stack.Screen
          name="about"
          options={{
            presentation: "modal",
            title: t("account.about"),
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            presentation: "modal",
            title: t("routes.notifications"),
            headerTitle: "",
          }}
        />
        <Stack.Screen
          name="home-search"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="theme-color"
          options={{
            presentation: "modal",
            title: t("routes.themeColor"),
            headerTitle: "",
          }}
        />
        <Stack.Screen
          name="notes"
          options={{
            presentation: "modal",
            title: t("routes.notes"),
            headerTitle: "",
          }}
        />
        <Stack.Screen
          name="calculator"
          options={{
            presentation: "modal",
            title: t("routes.calculator"),
            headerTitle: "",
          }}
        />
        <Stack.Screen
          name="legal-reader"
          options={{
            presentation: "modal",
            title: "Reader",
          }}
          dangerouslySingular={(_, params) => {
            const codeId = params?.codeId ? String(params.codeId) : "unknown";
            const language = params?.language ? String(params.language) : "th";
            const versionId = params?.versionId
              ? String(params.versionId)
              : "current";

            return `legal-reader:${codeId}:${language}:${versionId}`;
          }}
        />
        <Stack.Screen
          name="legal-section"
          options={{
            presentation: "modal",
            title: "Section",
            headerTitle: "",
          }}
        />
        <Stack.Screen
          name="legal-outline"
          options={{
            presentation: "modal",
            title: "Outline",
            headerTitle: "",
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
