export type OperationalStatus = 'AVAILABLE' | 'UNAVAILABLE';

export interface CourierUser {
  id: string;
  name: string;
  email: string;
  role: 'COURIER';
  company_id: string;
  operationalStatus: OperationalStatus;
}

export interface AuthState {
  user: CourierUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setSession: (user: CourierUser, token: string) => void;
  clearSession: () => void;
  setOperationalStatus: (status: OperationalStatus) => void;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  company_id: string;
  /** Returned in body by the backend alongside the httpOnly cookie */
  accessToken?: string;
}
