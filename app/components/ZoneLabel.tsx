import { AppText } from './AppText';
import { TextProps } from 'react-native';
import { useTheme } from '@/lib/hooks/useTheme';

interface ZoneLabelProps extends TextProps {
  children: string;
}

export function ZoneLabel({ style, ...rest }: ZoneLabelProps) {
  const { colors } = useTheme();
  return (
    <AppText
      variant="meta"
      color={colors.text.secondary}
      style={style}
      {...rest}
    />
  );
}
