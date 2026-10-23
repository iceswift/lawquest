import { Dimensions } from 'react-native';

const width = Dimensions.get('window').width;
const height = Dimensions.get('window').height;

export default {
  window: {
    width,
    height,
  },
  isSmallDevice: width < 375,
  
  // Chamber Noir Spacing Tokens
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
    archival: 42, // The specific gap between header and search
  },
  
  // Chamber Noir Radius Tokens
  radius: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 20,
    xl: 24,    // Standard Luxury Card radius
    xxl: 32,   // Modal/Panel radius
    full: 999, // Perfect circle
  },
  
  // Chamber Noir Component Specific Layout
  header: {
    paddingTopIOS: 70,
    paddingTopAndroid: 50,
    paddingBottom: 32,
  },
  search: {
    height: 48,
    borderRadius: 24,
  }
};
