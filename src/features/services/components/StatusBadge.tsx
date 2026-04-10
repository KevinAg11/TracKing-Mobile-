/**
 * Re-exports the shared StatusBadge with service-status mapping.
 * This keeps backward compatibility while centralizing the design.
 */
import React from 'react';
import { StatusBadge as SharedBadge } from '@/shared/ui/components/StatusBadge';
import type { BadgeVariant } from '@/shared/ui/components/StatusBadge';
import type { ServiceStatus } from '../types/services.types';

const STATUS_CONFIG: Record<ServiceStatus, { label: string; variant: BadgeVariant }> = {
  ASSIGNED: { label: 'Pendiente', variant: 'warning' },
  ACCEPTED: { label: 'Aceptado', variant: 'primary' },
  IN_TRANSIT: { label: 'En Ruta', variant: 'info' },
  DELIVERED: { label: 'Entregado', variant: 'success' },
};

export function StatusBadge({ status }: { status: ServiceStatus }) {
  const { label, variant } = STATUS_CONFIG[status];
  return <SharedBadge label={label} variant={variant} dot />;
}
