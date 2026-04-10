import React from 'react';
import {
  View,
  Text,
  ScrollView,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '@/features/auth/store/authStore';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ErrorState } from '@/shared/components/ErrorState';
import { Header } from '../components/Header';
import { KPIBox } from '../components/KPIBox';
import { ActiveServiceCard } from '../components/ActiveServiceCard';
import { DailyProgress } from '../components/DailyProgress';
import { useDashboard } from '../hooks/useDashboard';
import { ServiceCard } from '@/features/services/components/ServiceCard';
import type { MainTabParamList } from '@/app/navigation/TabNavigator';
import type { Service } from '@/features/services/types/services.types';

type HomeNav = BottomTabNavigationProp<MainTabParamList, 'Home'>;

const TABS = [
  { key: 'all' as const, label: 'Todos' },
  { key: 'pending' as const, label: 'Pendientes' },
  { key: 'completed' as const, label: 'Completados' },
];

export function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<HomeNav>();
  const {
    kpis,
    activeService,
    filteredServices,
    activeTab,
    setActiveTab,
    loading,
    refreshing,
    error,
    refresh,
  } = useDashboard();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const totalOrders = kpis.pending + kpis.inTransit + kpis.completed;

  // Navigate to the Orders tab — ServicesNavigator handles the detail push
  function handleServicePress(_service: Service) {
    navigation.navigate('Orders');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Header
        name={user?.name ?? ''}
        status={user?.operationalStatus ?? 'UNAVAILABLE'}
      />
      <FlatList
        data={filteredServices}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* ── KPIs ── */}
            <View style={styles.kpiRow}>
              <KPIBox
                label="Pendientes"
                value={kpis.pending}
                accent={colors.warning}
                icon="📋"
              />
              <KPIBox
                label="En Ruta"
                value={kpis.inTransit}
                accent={colors.primary}
                icon="🚚"
              />
            </View>

            {/* ── Daily progress ── */}
            <DailyProgress completed={kpis.completed} total={totalOrders} />

            {/* ── Filter tabs ── */}
            <View style={styles.tabsContainer}>
              {TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Active service card (only on "all" tab) ── */}
            {activeTab === 'all' && activeService ? (
              <View style={styles.activeSection}>
                <ActiveServiceCard
                  service={activeService}
                  onPress={() => handleServicePress(activeService)}
                  onNavigate={() => handleServicePress(activeService)}
                />
              </View>
            ) : null}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <ServiceCard
              service={item}
              onPress={() => handleServicePress(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>
              {activeTab === 'completed'
                ? 'Sin entregas completadas'
                : activeTab === 'pending'
                ? 'Sin pedidos pendientes'
                : 'Sin servicios asignados'}
            </Text>
            <Text style={styles.emptySubtext}>Tus pedidos aparecerán aquí</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingBottom: spacing.xxxl },

  // KPIs
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.lg,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tabText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.neutral500,
  },
  tabTextActive: {
    color: colors.neutral900,
    fontWeight: fontWeight.semibold,
  },

  // Active service
  activeSection: { marginBottom: spacing.md },

  // Service list cards
  cardWrapper: {
    paddingHorizontal: spacing.lg,
  },

  // Empty
  emptyCard: {
    margin: spacing.lg,
    padding: spacing.xxxl,
    backgroundColor: colors.white,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 40 },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.neutral800,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.neutral400,
  },
});
