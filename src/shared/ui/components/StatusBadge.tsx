import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../colors';
import { fontSize, fontWeight } from '../typography';
import { borderRadius, spacing } from '../spacing';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant: BadgeVariant;
  dot?: boolean;
}

const variantMap: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: colors.successBg, text: colors.successText },
  warning: { bg: colors.warningBg, text: colors.warningText },
  danger: { bg: colors.dangerBg, text: colors.dangerText },
  info: { bg: colors.infoBg, text: colors.infoText },
  primary: { bg: colors.primaryBg, text: colors.primaryDark },
  neutral: { bg: colors.neutral100, text: colors.neutral500 },
};

export function StatusBadge({ label, variant, dot = false }: StatusBadgeProps) {
  const { bg, text } = variantMap[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {dot && <View style={[styles.dot, { backgroundColor: text }]} />}
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
});
