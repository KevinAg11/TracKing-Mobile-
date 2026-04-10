import type { OperationalStatus } from '@/features/auth/types/auth.types';
import type { Service } from '@/features/services/types/services.types';

export interface CourierProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  company_id: string;
  operationalStatus: OperationalStatus;
}

export interface KPISummary {
  pending: number;
  inTransit: number;
  completed: number;
  earnings: number;
}

export interface DashboardData {
  profile: CourierProfile;
  services: Service[];
}
