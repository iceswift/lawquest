import React, { createContext, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  theme: 'light' | 'dark';
  isDark: boolean;
  tintColor: string;
  setTintColor: (color: string) => void;
  
  // Imperial Design Tokens
  colors: typeof Colors.light;
  layout: typeof Layout;
  typography: typeof Typography;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Preset Colors (Chamber Noir Palette)
export const ACCENT_COLORS = [
  { name: 'Chamber Gold', color: '#E5C158' },
  { name: 'Obsidian Crimson', color: '#AF2B2D' },
  { name: 'Midnight Sapphire', color: '#2A4E7A' },
  { name: 'Deep Emerald', color: '#367C5A' },
  { name: 'Sovereign Plum', color: '#856894' },
  { name: 'Smoked Bronze', color: '#A37F63' },
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [tintColor, setTintColor] = useState(ACCENT_COLORS[0].color);

  const themeName = themeMode === 'system' ? (systemColorScheme || 'light') : themeMode;
  const isDark = themeName === 'dark';
  
  // Resolve theme-specific colors
  const themeColors = isDark ? Colors.dark : Colors.light;

  const value = useMemo<ThemeContextType>(() => ({
    themeMode,
    setThemeMode,
    theme: themeName,
    isDark,
    tintColor,
    setTintColor,
    colors: themeColors,
    layout: Layout,
    typography: Typography,
  }), [isDark, themeColors, themeMode, themeName, tintColor]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};
