import { Platform } from 'react-native';

export default {
  // Chamber Noir Font Families
  fonts: {
    primary: 'Inter-Medium',
    bold: 'Inter-Bold',
    regal: 'Cormorant-Bold',
    regular: 'Inter-Regular',
  },
  
  // Chamber Noir Typography Scales
  presets: {
    eyebrow: {
      fontSize: 10,
      fontFamily: 'Inter-Bold',
      letterSpacing: 3.5,
      textTransform: 'uppercase' as const,
      opacity: 0.6,
    },
    h1: {
      fontSize: 35,
      fontFamily: 'Cormorant-Bold',
      letterSpacing: -0.6,
      lineHeight: 42,
    },
    h2: {
      fontSize: 27,
      fontFamily: 'Cormorant-Bold',
      letterSpacing: -0.3,
      lineHeight: 34,
    },
    h3: {
      fontSize: 21,
      fontFamily: 'Cormorant-Bold',
      letterSpacing: 0.1,
      lineHeight: 28,
    },
    subtitle: {
      fontSize: 12,
      fontFamily: 'Inter-Medium',
      letterSpacing: 1.2,
      textTransform: 'uppercase' as const,
      opacity: 0.5,
    },
    body: {
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      lineHeight: 21,
    },
    meta: {
      fontSize: 10,
      fontFamily: 'Inter-Bold',
      letterSpacing: 0.8,
    },
    caption: {
      fontSize: 11,
      fontFamily: 'Inter-Medium',
      opacity: 0.55,
    }
  }
};
