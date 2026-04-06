import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors } from '@/shared/ui/colors';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { StatusBadge } from '../components/StatusBadge';
import { useServiceDetail, canTransition, nextStatus } from '../hooks/useServices';
import { useServicesStore } from '../store/servicesStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useLocation } from '@/features/tracking/hooks/useLocation';
import { EvidenceCapture } from '@/features/evidence/components/EvidenceCapture';
import type { ServicesStackParamList } from '../navigation/ServicesNavigator';
import type { PaymentStatus } from '../types/services.types';

type Route = NativeStackScreenProps<ServicesStackParamList, 'ServiceDetail'>['route'];

const ACTION_LABEL: Record<string, string> = {
  ACCEPTED: 'Aceptar servicio',
  IN_TRANSIT: 'Iniciar ruta',
  DELIVERED: 'Finalizar entrega',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CREDIT: 'Crédito',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PAID: 'Pagado',
  UNPAID: 'No pagado',
};

export function ServiceDetailScreen() {
  const route = useRoute<Route>();
  const { serviceId } = route.params;
  const { performAction, actionLoading, performPaymentAction, paymentLoading } = useServiceDetail();
  const service = useServicesStore((s) => s.services.find((x) => x.id === serviceId));
  const servicesLoaded = useServicesStore((s) => s.services.length > 0 || s.loaded);
  const operationalStatus = useAuthStore((s) => s.user?.operationalStatus);

  const [localError, setLocalError] = useState<string | null>(null);
  const [evidenceUploaded, setEvidenceUploaded] = useState(false);
  // Payment modal — shown after DELIVERED transition
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Tracking: send location when mensajero is IN_SERVICE (backend state)
  // This aligns with the backend rule: only IN_SERVICE couriers can send location.
  const { latitude, longitude, permissionDenied } = useLocation({
    active: operationalStatus === 'IN_SERVICE',
  });

  if (!servicesLoaded) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!service) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.notFound}>Servicio no encontrado</Text>
      </SafeAreaView>
    );
  }

  const next = nextStatus(service.status);
  const canAct = canTransition(service.status);
  const isLoading = actionLoading === service.id;
  const needsEvidence = service.status === 'IN_TRANSIT';
  const actionBlocked = needsEvidence && !evidenceUploaded;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleAction = async () => {
    setLocalError(null);
    const result = await performAction(service);
    if (!result.ok) {
      setLocalError(result.error ?? 'Error desconocido');
      Alert.alert('Error', result.error ?? 'No se pudo actualizar el servicio');
      return;
    }
    // After transitioning to DELIVERED, ask about payment
    if (next === 'DELIVERED') {
      setShowPaymentModal(true);
    }
  };

  const handlePayment = async (status: PaymentStatus) => {
    setShowPaymentModal(false);
    const result = await performPaymentAction(service.id, status);
    if (!result.ok) {
      Alert.alert('Aviso', result.error ?? 'No se pudo actualizar el estado de pago');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Status */}
        <View style={styles.statusRow}>
          <StatusBadge status={service.status} />
        </View>

        {/* Addresses */}
        <View style={styles.section}>
          <Row label="Origen" value={service.origin_address} />
          <Row label="Destino" value={service.destination_address} />
          <Row label="Destinatario" value={service.destination_name} />
        </View>

        {/* Package */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paquete</Text>
          <Row label="Detalle" value={service.package_details} />
          <Row
            label="Método de pago"
            value={PAYMENT_METHOD_LABEL[service.payment_method] ?? service.payment_method}
          />
          <Row
            label="Estado de pago"
            value={PAYMENT_STATUS_LABEL[service.payment_status] ?? service.payment_status}
            highlight={service.payment_status === 'UNPAID'}
          />
          {service.notes_observations ? (
            <Row label="Notas" value={service.notes_observations} />
          ) : null}
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Valores</Text>
          <Row label="Domicilio" value={`${service.delivery_price.toFixed(2)}`} />
          <Row label="Producto" value={`${service.product_price.toFixed(2)}`} />
          <Row label="Total" value={`${service.total_price.toFixed(2)}`} highlight />
        </View>

        {/* Evidence — required before DELIVERED */}
        {needsEvidence ? (
          <EvidenceCapture
            serviceId={service.id}
            onUploaded={() => setEvidenceUploaded(true)}
          />
        ) : null}

        {localError ? <Text style={styles.errorText}>{localError}</Text> : null}
      </ScrollView>

      {/* Action button */}
      {canAct && next ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.actionBtn, (isLoading || actionBlocked) && styles.actionBtnDisabled]}
            onPress={handleAction}
            disabled={isLoading || actionBlocked}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>
                {actionBlocked ? 'Sube la evidencia primero' : ACTION_LABEL[next]}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Payment modal — shown after DELIVERED */}
      <PaymentModal
        visible={showPaymentModal}
        loading={paymentLoading}
        currentStatus={service.payment_status}
        totalPrice={service.total_price}
        onSelect={handlePayment}
        onDismiss={() => setShowPaymentModal(false)}
      />
    </SafeAreaView>
  );
}

// ── Payment Modal ─────────────────────────────────────────────────────────────

interface PaymentModalProps {
  visible: boolean;
  loading: boolean;
  currentStatus: PaymentStatus;
  totalPrice: number;
  onSelect: (status: PaymentStatus) => void;
  onDismiss: () => void;
}

function PaymentModal({
  visible,
  loading,
  currentStatus,
  totalPrice,
  onSelect,
  onDismiss,
}: PaymentModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={modalStyles.overlay}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>¿Te pagaron el servicio?</Text>
          <Text style={modalStyles.subtitle}>
            Total: <Text style={modalStyles.amount}>${totalPrice.toFixed(2)}</Text>
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : (
            <View style={modalStyles.buttons}>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.btnPaid]}
                onPress={() => onSelect('PAID')}
                activeOpacity={0.85}
              >
                <Text style={modalStyles.btnText}>Sí, me pagaron</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.btnUnpaid]}
                onPress={() => onSelect('UNPAID')}
                activeOpacity={0.85}
              >
                <Text style={modalStyles.btnText}>No me pagaron</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={modalStyles.btnSkip}
                onPress={onDismiss}
                activeOpacity={0.7}
              >
                <Text style={modalStyles.btnSkipText}>
                  Mantener estado actual ({PAYMENT_STATUS_LABEL[currentStatus]})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={rowStyles.container}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={[rowStyles.value, highlight && rowStyles.highlight]}>{value}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: { fontSize: fontSize.sm, color: '#6B7280' },
  value: {
    fontSize: fontSize.sm,
    color: colors.neutral800,
    fontWeight: fontWeight.medium,
    flex: 1,
    textAlign: 'right',
  },
  highlight: { color: colors.danger, fontWeight: fontWeight.bold },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.neutral50 },
  scroll: { padding: 16, paddingBottom: 100 },
  statusRow: { marginBottom: 16 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  notFound: { textAlign: 'center', marginTop: 60, color: '#9CA3AF' },
  errorText: { color: colors.danger, fontSize: fontSize.sm, textAlign: 'center', marginTop: 8 },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.neutral800,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  amount: {
    fontWeight: fontWeight.bold,
    color: colors.neutral800,
  },
  buttons: { gap: 12 },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnPaid: { backgroundColor: colors.success },
  btnUnpaid: { backgroundColor: colors.danger },
  btnText: { color: '#fff', fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  btnSkip: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  btnSkipText: {
    fontSize: fontSize.sm,
    color: '#9CA3AF',
  },
});
