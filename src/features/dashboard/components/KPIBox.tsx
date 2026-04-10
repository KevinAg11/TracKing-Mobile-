import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';

interface KPIBoxProps {
  label: string;
  value: string | number;
  accent?: string;
  icon?: string;
}

export function KPIBox({ label, value, accent = colors.primary, icon }: KPIBoxProps) {
  return (
    <View style={styles.container}>
      {icon ? <Text style={styles.icon}>{icon}</Text> : null}
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'flex-start',
    marginHorizontal: spacing.xs,
    ...shadows.sm,
  },
  icon: {
    fontSize: 20,
    marginBottom: spacing.sm,
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    lineHeight: fontSize.xxl * 1.1,
  },
  label: {
    fontSize: fontSize.xs,
    color: colors.neutral500,
    marginTop: spacing.xs,
  },
});
