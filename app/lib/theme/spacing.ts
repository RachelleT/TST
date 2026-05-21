import { useWindowDimensions } from 'react-native';

export interface SpacingTokens {
  /** Horizontal page margin */
  pagePadding: number;
  /** Card frame outer border radius */
  cardRadiusOuter: number;
  /** Card inner surface border radius */
  cardRadiusInner: number;
  /** Frame thickness (padding between frame edge and inner card) */
  frameThickness: number;
  /** Inner card content padding */
  cardPadding: number;
}

export function useSpacing(): SpacingTokens {
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  return {
    pagePadding:     isTablet ? 24 : 16,
    cardRadiusOuter: isTablet ? 24 : 18,
    cardRadiusInner: isTablet ? 16 : 12,
    frameThickness:  isTablet ? 10 : 8,
    cardPadding:     isTablet ? 16 : 12,
  };
}
