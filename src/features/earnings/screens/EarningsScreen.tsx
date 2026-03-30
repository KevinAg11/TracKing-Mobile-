import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ErrorState } from '@/shared/components/ErrorState';
import { useEarnings } from '../hooks/useEarnings';
import type { Liquidation } from '../api/earningsApi';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function LiquidationRow({ item }: { item: Liquidation }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowDate}>
          {formatDate(item.start_date)} — {formatDate(item.end_date)}
        </Text>
        <Text style={styles.rowServices}>{item.total_services} servicios</Text>
      </View>
      <Text style={styles.rowAmount}>${item.total_earned.toLocaleString('es-CO')}</Text>
    </View>
  );
}

export function EarningsScreen() {
  const { summary, liquidations, loading, refreshing, error, refresh } = useEarnings();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Ganancias</Text>
      </View>

      {/* Summary card */}
      {summary && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total acumulado</Text>
          <Text style={styles.summaryAmount}>
            ${summary.total_earned.toLocaleString('es-CO')}
          </Text>
          <View style={styles.summaryMeta}>
            <View style={styles.metaItem}>
              <Text style={styles.metaValue}>{summary.total_services}</Text>
              <Text style={styles.metaLabel}>Servicios</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaValue}>{summary.total_settlements}</Text>
              <Text style={styles.metaLabel}>Liquidaciones</Text>
            </View>
          </View>
        </View>
      )}

      {/* Liquidations list */}
      <Text style={styles.sectionTitle}>Historial de liquidaciones</Text>
      <FlatList
        data={liquidations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <LiquidationRow item={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin liquidaciones registradas</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral50 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.neutral800 },
  summaryCard: {
    margin: 16,
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  summaryLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  summaryAmount: {
    fontSize: 36,
    fontWeight: fontWeight.bold,
    color: '#fff',
    marginBottom: 16,
  },
  summaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 12,
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: '#fff' },
  metaLabel: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  metaDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  rowLeft: { gap: 3 },
  rowDate: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.neutral800 },
  rowServices: { fontSize: fontSize.xs, color: '#6B7280' },
  rowAmount: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.success },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: fontSize.sm, color: '#9CA3AF' },
});
