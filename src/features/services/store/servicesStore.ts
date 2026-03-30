import { create } from 'zustand';
import type { Service } from '../types/services.types';

interface ServicesState {
  services: Service[];
  /** True after the first successful fetch — prevents "not found" flash */
  loaded: boolean;
  setServices: (services: Service[]) => void;
  updateService: (updated: Service) => void;
}

export const useServicesStore = create<ServicesState>((set) => ({
  services: [],
  loaded: false,
  setServices: (services) => set({ services, loaded: true }),
  updateService: (updated) =>
    set((state) => ({
      services: state.services.map((s) => (s.id === updated.id ? updated : s)),
    })),
}));
