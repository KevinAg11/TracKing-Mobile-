import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing } from '@/shared/ui/spacing';
import type { OperationalStatus } from '@/features/auth/types/auth.types';

interface HeaderProps {
  name: string;
  status: OperationalStatus;
}

function getFormattedDate(): string {
  return new Date().toLocaleDateString('es-MX', {
    weekday: undefined,
    day: 'numeric',
    month: 'long',
  });
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function Header({ name, status }: HeaderProps) {
  const isOnline = status === 'AVAILABLE';
  const today = getFormattedDate();

  return (
    <View style={styles.container}>
      {/* Left: greeting */}
      <View style={styles.left}>
        <Text style={styles.greeting}>Hola, {name}</Text>
        <Text style={styles.date}>Hoy, {today}</Text>
      </View>

      {/* Right: avatar + notification */}
      <View style={styles.right}>
        <TouchableOpacity style={styles.notifBtn} activeOpacity={0.7}>
          <Text style={styles.notifIcon}>🔔</Text>
          <View style={styles.notifDot} />
        </TouchableOpacity>
        <View style={[styles.avatar, isOnline ? styles.avatarOnline : styles.avatarOffline]}>
          <Text style={styles.avatarText}>{getInitial(name)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  left: { flex: 1 },
  greeting: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    color: colors.neutral900,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.neutral500,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIcon: { fontSize: 18 },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarOnline: {
    backgroundColor: colors.primaryBg,
    borderColor: colors.primary,
  },
  avatarOffline: {
    backgroundColor: colors.neutral100,
    borderColor: colors.neutral200,
  },
  avatarText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
});
