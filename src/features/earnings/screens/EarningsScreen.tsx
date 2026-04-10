import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ErrorState } from '@/shared/components/ErrorState';
import { useEarnings } from '../hooks/useEarnings';
import type { Liquidation } from '../api/earningsApi';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
  }).toUpperCase();
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={statStyles.chip}>
      <Text style={statStyles.icon}>{icon}</Text>
      <Text style={statStyles.label}>{label}</Text>
      <Text style={statStyles.value}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  chip: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  icon: { fontSize: 22 },
  label: { fontSize: fontSize.xs, color: colors.neutral500 },
  value: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.neutral900 },
});

// ── Income / deduction row ────────────────────────────────────────────────────
function IncomeRow({
  icon,
  title,
  subtitle,
  amount,
  positive,
}: {
  icon: string;
  title: string;
  subtitle: string;
  amount: string;
  positive?: boolean;
}) {
  return (
    <View style={rowStyles.container}>
      <View style={rowStyles.iconWrap}>
        <Text style={rowStyles.icon}>{icon}</Text>
      </View>
      <View style={rowStyles.info}>
        <Text style={rowStyles.title}>{title}</Text>
        <Text style={rowStyles.subtitle}>{subtitle}</Text>
      </View>
      <Text style={[rowStyles.amount, positive ? rowStyles.positive : rowStyles.negative]}>
        {amount}
      </Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  title: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.neutral800 },
  subtitle: { fontSize: fontSize.xs, color: colors.neutral500, marginTop: 2 },
  amount: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  positive: { color: colors.success },
  negative: { color: colors.danger },
});

// ── Liquidation history row ───────────────────────────────────────────────────
function LiquidationRow({ item }: { item: Liquidation }) {
  return (
    <View style={histStyles.row}>
      <View style={histStyles.left}>
        <Text style={histStyles.date}>
          {formatDate(item.start_date)} — {formatDate(item.end_date)}
        </Text>
        <Text style={histStyles.services}>{item.total_services} servicios</Text>
      </View>
      <Text style={histStyles.amount}>
        ${item.total_earned.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </Text>
    </View>
  );
}

const histStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  left: { gap: 3 },
  date: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.neutral800 },
  services: { fontSize: fontSize.xs, color: colors.neutral500 },
  amount: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.success },
});

// ── Main screen ───────────────────────────────────────────────────────────────
export function EarningsScreen() {
  const { summary, liquidations, loading, refreshing, error, refresh } = useEarnings();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const totalEarned = summary?.total_earned ?? 0;
  const totalServices = summary?.total_services ?? 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Liquidación del Día</Text>
        <TouchableOpacity style={styles.calendarBtn} activeOpacity={0.7}>
          <Text style={styles.calendarIcon}>📅</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={liquidations}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* ── Hero card ── */}
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>Total a Pagar</Text>
              <Text style={styles.heroAmount}>
                ${totalEarned.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Text>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>📈 +12% vs ayer</Text>
              </View>
            </View>

            {/* ── Stats row ── */}
            <View style={styles.statsRow}>
              <StatChip icon="🚚" label="Pedidos" value={String(totalServices)} />
              <StatChip icon="⏱" label="Tiempo" value="6.5h" />
              <StatChip icon="📍" label="Distancia" value="42km" />
            </View>

            {/* ── Ingresos ── */}
            <Text style={styles.sectionTitle}>Ingresos</Text>
            <IncomeRow
              icon="🏍"
              title="Tarifa Base"
              subtitle={`${totalServices} entregas`}
              amount={`$${(totalEarned * 0.72).toFixed(2)}`}
              positive
            />
            <IncomeRow
              icon="👍"
              title="Propinas"
              subtitle="100% tuyas"
              amount={`+$${(totalEarned * 0.16).toFixed(2)}`}
              positive
            />
            <IncomeRow
              icon="🌧"
              title="Bono por Lluvia"
              subtitle="Zona Norte"
              amount={`+$${(totalEarned * 0.12).toFixed(2)}`}
              positive
            />

            {/* ── Deducciones ── */}
            <Text style={styles.sectionTitle}>Deducciones</Text>
            <IncomeRow
              icon="💵"
              title="Efectivo Recibido"
              subtitle="Pago en mano de clientes"
              amount="-$4.50"
              positive={false}
            />

            {/* ── Historial ── */}
            {liquidations.length > 0 && (
              <Text style={styles.sectionTitle}>Historial de liquidaciones</Text>
            )}
          </>
        }
        renderItem={({ item }) => <LiquidationRow item={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>Sin liquidaciones registradas</Text>
          </View>
        }
      />

      {/* ── CTA fijo ── */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.85}>
          <Text style={styles.ctaText}>Transferir a mi Cuenta →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral100,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.neutral900,
  },
  calendarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarIcon: { fontSize: 18 },

  // Hero card
  heroCard: {
    margin: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    ...shadows.primary,
  },
  heroLabel: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.sm,
  },
  heroAmount: {
    fontSize: fontSize.xxxl,
    fontWeight: fontWeight.extrabold,
    color: colors.white,
    marginBottom: spacing.md,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  heroBadgeText: {
    fontSize: fontSize.xs,
    color: colors.white,
    fontWeight: fontWeight.medium,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },

  // Sections
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.neutral900,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },

  list: {
    paddingBottom: 100, // space for CTA
  },

  // Empty
  empty: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.md },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: fontSize.sm, color: colors.neutral400 },

  // CTA
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral100,
  },
  ctaBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    ...shadows.primary,
  },
  ctaText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
  },
});
