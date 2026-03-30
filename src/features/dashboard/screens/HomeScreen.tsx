import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/auth/store/authStore';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ErrorState } from '@/shared/components/ErrorState';
import { Header } from '../components/Header';
import { KPIBox } from '../components/KPIBox';
import { ActiveServiceCard } from '../components/ActiveServiceCard';
import { useDashboard } from '../hooks/useDashboard';

export function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { kpis, activeService, loading, refreshing, error, refresh } = useDashboard();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        name={user?.name ?? ''}
        status={user?.operationalStatus ?? 'UNAVAILABLE'}
      />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {/* KPIs */}
        <View style={styles.kpiRow}>
          <KPIBox label="Pendientes" value={kpis.pending} accent={colors.warning} />
          <KPIBox label="Completados" value={kpis.completed} accent={colors.success} />
          <KPIBox
            label="Ganancias"
            value={`$${kpis.earnings.toFixed(0)}`}
            accent={colors.primary}
          />
        </View>

        {/* Active service */}
        {activeService ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Servicio en curso</Text>
            <ActiveServiceCard service={activeService} />
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Sin servicio activo</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral50 },
  scroll: { paddingBottom: 24 },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  section: { marginTop: 8 },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyCard: {
    margin: 16,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: '#9CA3AF',
  },
});
