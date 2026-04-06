export type ServiceStatus = 'ASSIGNED' | 'ACCEPTED' | 'IN_TRANSIT' | 'DELIVERED';
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CREDIT';
export type PaymentStatus = 'PAID' | 'UNPAID';

export interface Service {
  id: string;
  status: ServiceStatus;
  origin_address: string;
  destination_address: string;
  destination_name: string;
  package_details: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  is_settled_courier: boolean;
  is_settled_customer: boolean;
  total_price: number;
  delivery_price: number;
  product_price: number;
  notes_observations?: string;
  courier_id?: string;
}
