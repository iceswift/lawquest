import AsyncStorage from "@react-native-async-storage/async-storage";

export type HomeShortcutKey =
  | "criminal"
  | "civil"
  | "const"
  | "procedure"
  | "neti"
  | "quiz"
  | "notes"
  | "saved";

export interface HomeShortcutItem {
  id: HomeShortcutKey;
  labelKey: string;
  icon: string;
  key: HomeShortcutKey;
}

export const DEFAULT_HOME_SHORTCUTS: HomeShortcutItem[] = [
  {
    id: "quiz",
    labelKey: "home.shortcuts.calculator",
    icon: "calculator",
    key: "quiz",
  },
  {
    id: "notes",
    labelKey: "home.shortcuts.notes",
    icon: "sticky-note",
    key: "notes",
  },
];

const HOME_SHORTCUT_ORDER_KEY = "lawquest.homeShortcuts.v1";

export function getHomeShortcutRoute(key: HomeShortcutKey) {
  switch (key) {
    case "notes":
      return "/notes";
    case "quiz":
      return "/calculator";
    case "saved":
      return "/(tabs)/saved";
    default:
      return null;
  }
}

export async function readHomeShortcuts(): Promise<HomeShortcutItem[]> {
  const rawValue = await AsyncStorage.getItem(HOME_SHORTCUT_ORDER_KEY);

  if (!rawValue) {
    return [...DEFAULT_HOME_SHORTCUTS];
  }

  const parsed = JSON.parse(rawValue) as unknown;

  if (!Array.isArray(parsed)) {
    return [...DEFAULT_HOME_SHORTCUTS];
  }

  return mergeShortcutOrder(parsed);
}

export async function saveHomeShortcutOrder(shortcuts: HomeShortcutItem[]) {
  const orderedKeys = shortcuts.map((shortcut) => shortcut.key);

  await AsyncStorage.setItem(
    HOME_SHORTCUT_ORDER_KEY,
    JSON.stringify(orderedKeys),
  );
}

export async function resetHomeShortcutOrder() {
  await AsyncStorage.removeItem(HOME_SHORTCUT_ORDER_KEY);
  return [...DEFAULT_HOME_SHORTCUTS];
}

function mergeShortcutOrder(value: unknown[]) {
  const defaultByKey = new Map(
    DEFAULT_HOME_SHORTCUTS.map((shortcut) => [shortcut.key, shortcut]),
  );
  const orderedShortcuts: HomeShortcutItem[] = [];
  const usedKeys = new Set<HomeShortcutKey>();

  value.forEach((item) => {
    if (!isHomeShortcutKey(item) || usedKeys.has(item)) {
      return;
    }

    const shortcut = defaultByKey.get(item);
    if (!shortcut) {
      return;
    }

    orderedShortcuts.push(shortcut);
    usedKeys.add(item);
  });

  DEFAULT_HOME_SHORTCUTS.forEach((shortcut) => {
    if (!usedKeys.has(shortcut.key)) {
      orderedShortcuts.push(shortcut);
    }
  });

  return orderedShortcuts;
}

function isHomeShortcutKey(value: unknown): value is HomeShortcutKey {
  return (
    value === "criminal" ||
    value === "civil" ||
    value === "const" ||
    value === "procedure" ||
    value === "neti" ||
    value === "quiz" ||
    value === "notes" ||
    value === "saved"
  );
}
