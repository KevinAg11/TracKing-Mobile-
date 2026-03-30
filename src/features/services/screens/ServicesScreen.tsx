import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ErrorState } from '@/shared/components/ErrorState';
import { ServiceCard } from '../components/ServiceCard';
import { useServices } from '../hooks/useServices';
import type { Service } from '../types/services.types';
import type { ServicesStackParamList } from '../navigation/ServicesNavigator';

type Nav = NativeStackNavigationProp<ServicesStackParamList, 'ServicesList'>;

export function ServicesScreen() {
  const navigation = useNavigation<Nav>();
  const { services, loading, refreshing, error, refresh } = useServices();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Servicios</Text>
        <Text style={styles.count}>{services.length} asignados</Text>
      </View>
      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: { item: Service }) => (
          <ServiceCard
            service={item}
            onPress={() => navigation.navigate('ServiceDetail', { serviceId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Sin servicios asignados</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral50 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.neutral800 },
  count: { fontSize: fontSize.sm, color: '#6B7280' },
  list: { padding: 16 },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: fontSize.sm, color: '#9CA3AF' },
});
