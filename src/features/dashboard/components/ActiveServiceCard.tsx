import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { StatusBadge } from '@/features/services/components/StatusBadge';
import type { Service } from '@/features/services/types/services.types';

interface ActiveServiceCardProps {
  service: Service;
  onPress?: () => void;
  onNavigate?: () => void;
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function ActiveServiceCard({ service, onPress, onNavigate }: ActiveServiceCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* ── Top row: badge + order id ── */}
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <StatusBadge status={service.status} />
          <Text style={styles.orderId}>#{service.id.slice(-4).toUpperCase()}</Text>
        </View>
      </View>

      {/* ── Route: origin → destination ── */}
      <View style={styles.route}>
        {/* Origin */}
        <View style={styles.routeRow}>
          <View style={styles.dotOrigin} />
          <View style={styles.routeTextBlock}>
            <Text style={styles.routeLabel}>RECOGIDA</Text>
            <Text style={styles.routeAddress} numberOfLines={1}>
              {service.origin_address}
            </Text>
          </View>
        </View>

        {/* Connector line */}
        <View style={styles.connector} />

        {/* Destination */}
        <View style={styles.routeRow}>
          <View style={styles.dotDest} />
          <View style={styles.routeTextBlock}>
            <Text style={[styles.routeLabel, { color: colors.primary }]}>ENTREGA</Text>
            <Text style={[styles.routeAddress, styles.routeAddressBold]} numberOfLines={1}>
              {service.destination_address}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Footer: client + actions ── */}
      <View style={styles.footer}>
        <View style={styles.clientRow}>
          <View style={styles.clientAvatar}>
            <Text style={styles.clientInitial}>{getInitial(service.destination_name)}</Text>
          </View>
          <View>
            <Text style={styles.clientName}>{service.destination_name}</Text>
            <Text style={styles.clientSub}>{service.payment_method}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.callBtn} activeOpacity={0.7}>
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.navigateBtn}
            onPress={onNavigate}
            activeOpacity={0.85}
          >
            <Text style={styles.navigateIcon}>🗺</Text>
            <Text style={styles.navigateText}>Navegar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadows.md,
  },

  // Top row
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  orderId: {
    fontSize: fontSize.xs,
    color: colors.neutral500,
    fontWeight: fontWeight.medium,
  },

  // Route
  route: { marginBottom: spacing.lg },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  dotOrigin: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.neutral400,
    marginTop: 4,
  },
  dotDest: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  connector: {
    width: 1.5,
    height: 16,
    backgroundColor: colors.neutral200,
    marginLeft: 4,
    marginVertical: 2,
  },
  routeTextBlock: { flex: 1 },
  routeLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.neutral400,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: fontSize.sm,
    color: colors.neutral600,
  },
  routeAddressBold: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.neutral900,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInitial: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  clientName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.neutral800,
  },
  clientSub: {
    fontSize: fontSize.xs,
    color: colors.neutral500,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callIcon: { fontSize: 18 },
  navigateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  navigateIcon: { fontSize: 14 },
  navigateText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.white,
  },
});
