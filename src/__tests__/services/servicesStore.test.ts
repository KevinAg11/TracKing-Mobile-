import * as fc from 'fast-check';
import { useServicesStore } from '@/features/services/store/servicesStore';
import type { Service, ServiceStatus } from '@/features/services/types/services.types';

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: 'svc-1',
    status: 'ASSIGNED',
    origin_address: 'Calle 10 #20-30',
    destination_address: 'Carrera 5 #15-20',
    destination_name: 'Pedro Gómez',
    package_details: 'Caja pequeña',
    payment_method: 'CASH',
    payment_status: 'UNPAID',
    is_settled_courier: false,
    is_settled_customer: false,
    total_price: 58000,
    delivery_price: 8000,
    product_price: 50000,
    ...overrides,
  };
}

// ─── setServices ──────────────────────────────────────────────────────────────

describe('servicesStore — setServices', () => {
  beforeEach(() => {
    useServicesStore.setState({ services: [], loaded: false });
  });

  it('reemplaza la lista completa', () => {
    const svcs = [makeService({ id: 'a' }), makeService({ id: 'b' })];
    useServicesStore.getState().setServices(svcs);
    expect(useServicesStore.getState().services).toHaveLength(2);
  });

  it('marca loaded=true tras el primer setServices', () => {
    useServicesStore.getState().setServices([makeService()]);
    expect(useServicesStore.getState().loaded).toBe(true);
  });

  it('acepta lista vacía sin error', () => {
    useServicesStore.getState().setServices([makeService()]);
    useServicesStore.getState().setServices([]);
    expect(useServicesStore.getState().services).toHaveLength(0);
    expect(useServicesStore.getState().loaded).toBe(true);
  });
});

// ─── updateService ────────────────────────────────────────────────────────────

describe('servicesStore — updateService', () => {
  beforeEach(() => {
    useServicesStore.setState({ services: [], loaded: false });
  });

  it('actualiza el servicio que coincide por id', () => {
    useServicesStore.getState().setServices([makeService({ id: 'svc-1', status: 'ASSIGNED' })]);
    useServicesStore.getState().updateService(makeService({ id: 'svc-1', status: 'ACCEPTED' }));
    expect(useServicesStore.getState().services[0].status).toBe('ACCEPTED');
  });

  it('no afecta otros servicios', () => {
    useServicesStore.getState().setServices([
      makeService({ id: 'svc-1', status: 'ASSIGNED' }),
      makeService({ id: 'svc-2', status: 'ASSIGNED' }),
    ]);
    useServicesStore.getState().updateService(makeService({ id: 'svc-1', status: 'ACCEPTED' }));
    expect(useServicesStore.getState().services[1].status).toBe('ASSIGNED');
  });

  it('ignora ids desconocidos sin lanzar error', () => {
    useServicesStore.getState().setServices([makeService({ id: 'svc-1' })]);
    useServicesStore.getState().updateService(makeService({ id: 'unknown', status: 'DELIVERED' }));
    expect(useServicesStore.getState().services[0].status).toBe('ASSIGNED');
  });

  it('preserva el total de servicios tras update', () => {
    const svcs = [makeService({ id: 'a' }), makeService({ id: 'b' }), makeService({ id: 'c' })];
    useServicesStore.getState().setServices(svcs);
    useServicesStore.getState().updateService(makeService({ id: 'b', status: 'IN_TRANSIT' }));
    expect(useServicesStore.getState().services).toHaveLength(3);
  });
});

// ─── PBT: setServices → length invariant ─────────────────────────────────────

describe('P-1: setServices preserva el tamaño de la lista (PBT)', () => {
  it('P-1: la lista resultante siempre tiene el mismo tamaño que la entrada', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            status: fc.constantFrom<ServiceStatus>('ASSIGNED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'),
          }),
          { minLength: 0, maxLength: 20 },
        ),
        (items) => {
          useServicesStore.setState({ services: [], loaded: false });
          const svcs = items.map((i) => makeService({ id: i.id, status: i.status }));
          useServicesStore.getState().setServices(svcs);
          expect(useServicesStore.getState().services).toHaveLength(items.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── PBT: updateService es idempotente ───────────────────────────────────────

describe('P-2: updateService es idempotente (PBT)', () => {
  it('P-2: aplicar el mismo update dos veces produce el mismo resultado', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ServiceStatus>('ASSIGNED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'),
        (status) => {
          useServicesStore.setState({ services: [], loaded: false });
          useServicesStore.getState().setServices([makeService({ id: 'svc-1', status: 'ASSIGNED' })]);
          const updated = makeService({ id: 'svc-1', status });
          useServicesStore.getState().updateService(updated);
          useServicesStore.getState().updateService(updated);
          expect(useServicesStore.getState().services[0].status).toBe(status);
        },
      ),
      { numRuns: 100 },
    );
  });
});
