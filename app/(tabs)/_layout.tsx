import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import {
    Dimensions,
    Platform,
    Pressable,
    StyleSheet,
    View,
    useWindowDimensions
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from "react-native-reanimated";
import { useAppTheme } from "../../context/ThemeContext";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { GlobalTTSMiniPlayer } from "@/components/tts/GlobalTTSMiniPlayer";

const INDICATOR_SIZE = 4;

type CustomTabItemProps = {
  state: BottomTabBarProps["state"];
  descriptors: BottomTabBarProps["descriptors"];
  navigation: BottomTabBarProps["navigation"];
  route: BottomTabBarProps["state"]["routes"][0];
  index: number;
};

function CustomTabItem({ state, descriptors, navigation, route, index }: CustomTabItemProps) {
  const { isDark, tintColor, colors, typography, layout } = useAppTheme();
  const { options } = descriptors[route.key];
  const label =
    options.tabBarLabel !== undefined
      ? options.tabBarLabel
      : options.title !== undefined
        ? options.title
        : route.name;

  const isFocused = state.index === index;

  const onPress = () => {
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate(route.name);
    }
  };

  const scale = useSharedValue(1);

  React.useEffect(() => {
    scale.value = withSpring(isFocused ? 1.1 : 1, {
      damping: 15,
      stiffness: 150,
    });
  }, [isFocused]);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedLabelStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isFocused ? 1 : 0.5, { duration: 250 }),
  }));

  const inactiveColor = colors.subtext;
  const iconName = options.tabBarIcon
    ? (
        options.tabBarIcon({
          focused: isFocused,
          color: isFocused ? tintColor : inactiveColor,
          size: 22,
        }) as any
      ).props.name
    : "help-circle-outline";

  return (
    <Pressable onPress={onPress} style={styles.tabItem}>
      <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
        <Ionicons
          name={
            isFocused ? iconName : `${iconName.replace("-outline", "")}-outline`
          }
          size={22}
          color={isFocused ? tintColor : inactiveColor}
        />
      </Animated.View>
      <Animated.Text
        style={[
          styles.tabLabel,
          { color: isFocused ? tintColor : inactiveColor },
          animatedLabelStyle,
        ]}
      >
        {typeof label === 'function' ? route.name : label}
      </Animated.Text>
    </Pressable>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { isDark, tintColor, colors, layout } = useAppTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const TAB_BAR_WIDTH = width - 40;
  const TAB_BAR_PADDING = 12;
  const TAB_WIDTH = (TAB_BAR_WIDTH - TAB_BAR_PADDING * 2) / 5;

  const translateX = useSharedValue(state.index * TAB_WIDTH);

  React.useEffect(() => {
    translateX.value = withSpring(state.index * TAB_WIDTH, {
      damping: 20,
      stiffness: 120,
      mass: 0.8,
    });
  }, [state.index, TAB_WIDTH]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          translateX.value + TAB_BAR_PADDING + (TAB_WIDTH - INDICATOR_SIZE) / 2,
      },
      { scale: withSpring(1) },
    ],
    opacity: withTiming(1, { duration: 300 }),
  }));

  return (
        <View
          style={[
            styles.tabBarWrapper,
            { bottom: layout.spacing.lg },
          ]}
        >
          <BlurView
            intensity={isDark ? 30 : 50}
            tint={isDark ? "dark" : "light"}
            style={[
              styles.tabBarContainer,
              {
                width: TAB_BAR_WIDTH,
                paddingHorizontal: TAB_BAR_PADDING,
                backgroundColor: isDark ? "rgba(20,20,20,0.85)" : "rgba(255,255,255,0.85)",
                borderColor: colors.goldSubtle,
                borderWidth: 1,
              },
            ]}
          >
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: tintColor },
            indicatorStyle,
          ]}
        />

        {state.routes.map((route: BottomTabBarProps["state"]["routes"][0], index: number) => (
          <CustomTabItem
            key={route.key}
            state={state}
            descriptors={descriptors}
            navigation={navigation}
            route={route}
            index={index}
          />
        ))}
      </BlurView>
    </View>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  return (
    <>
      <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.home"),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="books"
        options={{
          title: t("tabs.books"),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "library" : "library-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: t("tabs.games"),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "trophy" : "trophy-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: t("tabs.saved"),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "bookmark" : "bookmark-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("tabs.account"),
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      </Tabs>
      <GlobalTTSMiniPlayer />
    </>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 36 : 24,
    left: 20,
    right: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarContainer: {
    flexDirection: "row",
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
    paddingBottom: 10,
  },
  iconContainer: {
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 9,
    fontFamily: "Inter-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  indicator: {
    position: "absolute",
    bottom: 10,
    left: 0,
    width: INDICATOR_SIZE,
    height: INDICATOR_SIZE,
    borderRadius: INDICATOR_SIZE / 2,
  },
});
