import { PartOfSpeech } from '@tst/shared';

export interface PosTokens {
  frame: string;
  badgeFill: string;
  badgeText: string;
  /** Darkest stop — used for the word in the card header */
  headerText: string;
  /** Very light tint — sentence zone background */
  sentenceBg: string;
  /** Mid stop — sentence zone left border */
  sentenceBorder: string;
}

export interface ColorTokens {
  surface: { page: string; card: string; elevated: string };
  text: { primary: string; secondary: string; tertiary: string };
  border: { subtle: string };
  accent: { primary: string; muted: string };
  pos: Record<PartOfSpeech, PosTokens>;
}

const posLight: Record<PartOfSpeech, PosTokens> = {
  noun:         { frame: '#993C1D', badgeFill: '#F0997B', badgeText: '#4A1B0C', headerText: '#4A1B0C', sentenceBg: '#FFF0EB', sentenceBorder: '#E8A087' },
  verb:         { frame: '#185FA5', badgeFill: '#85B7EB', badgeText: '#042C53', headerText: '#042C53', sentenceBg: '#EFF5FD', sentenceBorder: '#8BB8E8' },
  adjective:    { frame: '#2F5240', badgeFill: '#EF9F27', badgeText: '#4A2515', headerText: '#1A3328', sentenceBg: '#EEF4EF', sentenceBorder: '#9CB8A4' },
  adverb:       { frame: '#534AB7', badgeFill: '#AFA9EC', badgeText: '#26215C', headerText: '#26215C', sentenceBg: '#F2F1FA', sentenceBorder: '#B5B0E4' },
  preposition:  { frame: '#7A5A0F', badgeFill: '#F4C775', badgeText: '#412402', headerText: '#412402', sentenceBg: '#FBF5E6', sentenceBorder: '#D4B86A' },
};

const posDark: Record<PartOfSpeech, PosTokens> = {
  noun:         { frame: '#A35238', badgeFill: '#F0997B', badgeText: '#4A1B0C', headerText: '#F0997B', sentenceBg: '#2E2320', sentenceBorder: '#A35238' },
  verb:         { frame: '#3A7BB8', badgeFill: '#85B7EB', badgeText: '#042C53', headerText: '#85B7EB', sentenceBg: '#1E2A36', sentenceBorder: '#3A7BB8' },
  adjective:    { frame: '#5C7B66', badgeFill: '#EF9F27', badgeText: '#4A2515', headerText: '#A8C4AF', sentenceBg: '#232D26', sentenceBorder: '#5C7B66' },
  adverb:       { frame: '#7068C9', badgeFill: '#AFA9EC', badgeText: '#26215C', headerText: '#AFA9EC', sentenceBg: '#252338', sentenceBorder: '#7068C9' },
  preposition:  { frame: '#A07B2A', badgeFill: '#F4C775', badgeText: '#412402', headerText: '#F4C775', sentenceBg: '#2A2518', sentenceBorder: '#A07B2A' },
};

export const lightColors: ColorTokens = {
  surface: { page: '#FBF9F5', card: '#FFFFFF', elevated: '#F4F0E6' },
  text: { primary: '#1A2520', secondary: '#6B7568', tertiary: '#8A9088' },
  border: { subtle: '#E5E0D2' },
  accent: { primary: '#2F5240', muted: '#DDE9DE' },
  pos: posLight,
};

export const darkColors: ColorTokens = {
  surface: { page: '#1A1F1B', card: '#252B26', elevated: '#2E342F' },
  text: { primary: '#F4F0E6', secondary: '#A8B0A6', tertiary: '#7A847B' },
  border: { subtle: '#3A413B' },
  accent: { primary: '#7CA890', muted: '#3F5D4C' },
  pos: posDark,
};
