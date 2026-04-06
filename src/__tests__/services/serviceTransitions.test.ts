import * as fc from 'fast-check';
import { canTransition, nextStatus } from '@/features/services/hooks/useServices';
import type { ServiceStatus } from '@/features/services/types/services.types';

// ─── canTransition ────────────────────────────────────────────────────────────

describe('canTransition', () => {
  it('ASSIGNED → puede transicionar', () => {
    expect(canTransition('ASSIGNED')).toBe(true);
  });

  it('ACCEPTED → puede transicionar', () => {
    expect(canTransition('ACCEPTED')).toBe(true);
  });

  it('IN_TRANSIT → puede transicionar', () => {
    expect(canTransition('IN_TRANSIT')).toBe(true);
  });

  it('DELIVERED → estado terminal, no puede transicionar', () => {
    expect(canTransition('DELIVERED')).toBe(false);
  });
});

// ─── nextStatus ───────────────────────────────────────────────────────────────

describe('nextStatus', () => {
  it('ASSIGNED → ACCEPTED', () => {
    expect(nextStatus('ASSIGNED')).toBe('ACCEPTED');
  });

  it('ACCEPTED → IN_TRANSIT', () => {
    expect(nextStatus('ACCEPTED')).toBe('IN_TRANSIT');
  });

  it('IN_TRANSIT → DELIVERED', () => {
    expect(nextStatus('IN_TRANSIT')).toBe('DELIVERED');
  });

  it('DELIVERED → null (sin siguiente estado)', () => {
    expect(nextStatus('DELIVERED')).toBeNull();
  });

  it('ASSIGNED no salta estados intermedios', () => {
    expect(nextStatus('ASSIGNED')).not.toBe('IN_TRANSIT');
    expect(nextStatus('ASSIGNED')).not.toBe('DELIVERED');
  });
});

// ─── Cadena completa ──────────────────────────────────────────────────────────

describe('cadena de transiciones completa', () => {
  it('sigue la secuencia correcta de inicio a fin', () => {
    const chain: ServiceStatus[] = [];
    let current: ServiceStatus = 'ASSIGNED';

    while (canTransition(current)) {
      const next = nextStatus(current)!;
      chain.push(next);
      current = next;
    }

    expect(chain).toEqual(['ACCEPTED', 'IN_TRANSIT', 'DELIVERED']);
  });

  it('la cadena termina exactamente en DELIVERED', () => {
    let current: ServiceStatus = 'ASSIGNED';
    while (canTransition(current)) {
      current = nextStatus(current)!;
    }
    expect(current).toBe('DELIVERED');
  });
});

// ─── PBT: estados no terminales siempre tienen siguiente ─────────────────────

describe('P-1: estados no terminales siempre tienen nextStatus (PBT)', () => {
  it('P-1: ASSIGNED, ACCEPTED, IN_TRANSIT → nextStatus nunca es null', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ServiceStatus>('ASSIGNED', 'ACCEPTED', 'IN_TRANSIT'),
        (status) => {
          expect(nextStatus(status)).not.toBeNull();
          expect(canTransition(status)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── PBT: DELIVERED siempre es terminal ──────────────────────────────────────

describe('P-2: DELIVERED siempre es estado terminal (PBT)', () => {
  it('P-2: canTransition(DELIVERED) siempre es false', () => {
    fc.assert(
      fc.property(
        fc.constant<ServiceStatus>('DELIVERED'),
        (status) => {
          expect(canTransition(status)).toBe(false);
          expect(nextStatus(status)).toBeNull();
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── PBT: nextStatus es determinista ─────────────────────────────────────────

describe('P-3: nextStatus es determinista (PBT)', () => {
  it('P-3: el mismo estado siempre produce el mismo siguiente estado', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ServiceStatus>('ASSIGNED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'),
        (status) => {
          expect(nextStatus(status)).toBe(nextStatus(status));
        },
      ),
      { numRuns: 100 },
    );
  });
});
