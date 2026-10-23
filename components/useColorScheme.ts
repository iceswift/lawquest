import { useAppTheme } from '../context/ThemeContext';

export function useColorScheme() {
  const { theme } = useAppTheme();
  return theme;
}
