import * as fc from 'fast-check';
import { handleApiError } from '@/shared/utils/errorHandler';

// ─── Casos conocidos ──────────────────────────────────────────────────────────

describe('handleApiError — códigos conocidos', () => {
  it('400 sin mensaje → mensaje genérico en español', () => {
    expect(handleApiError(400)).toBe('Solicitud invalida. Verifica los datos ingresados.');
  });

  it('400 con serverMessage → usa serverMessage', () => {
    expect(handleApiError(400, 'El campo email es requerido')).toBe('El campo email es requerido');
  });

  it('401 → sesión expirada', () => {
    expect(handleApiError(401)).toBe('Sesion expirada. Por favor inicia sesion nuevamente.');
  });

  it('403 → acceso denegado', () => {
    expect(handleApiError(403)).toBe('Acceso denegado.');
  });

  it('404 → recurso no encontrado', () => {
    expect(handleApiError(404)).toBe('Recurso no encontrado.');
  });

  it('409 sin mensaje → conflicto genérico', () => {
    expect(handleApiError(409)).toBe('Conflicto: el recurso ya existe.');
  });

  it('409 con serverMessage → usa serverMessage', () => {
    expect(handleApiError(409, 'Ya existe un mensajero con ese email')).toBe(
      'Ya existe un mensajero con ese email',
    );
  });

  it('422 sin mensaje → operación no permitida', () => {
    expect(handleApiError(422)).toBe('Operacion no permitida por reglas de negocio.');
  });

  it('422 con serverMessage → usa serverMessage', () => {
    expect(handleApiError(422, 'Solo mensajeros IN_SERVICE pueden registrar ubicación')).toBe(
      'Solo mensajeros IN_SERVICE pueden registrar ubicación',
    );
  });

  it('429 → demasiadas solicitudes', () => {
    expect(handleApiError(429)).toBe(
      'Demasiadas solicitudes. Por favor espera antes de intentar de nuevo.',
    );
  });

  it('500 → error del servidor', () => {
    expect(handleApiError(500)).toBe('Error del servidor. Por favor intenta mas tarde.');
  });

  it('0 → sin conexión', () => {
    expect(handleApiError(0)).toBe('Sin conexion al servidor. Verifica tu red.');
  });

  it('código desconocido con serverMessage → usa serverMessage', () => {
    expect(handleApiError(503, 'Servicio no disponible')).toBe('Servicio no disponible');
  });

  it('código desconocido sin serverMessage → error inesperado', () => {
    expect(handleApiError(418)).toBe('Ocurrio un error inesperado.');
  });
});

// ─── PBT: serverMessage siempre tiene precedencia en códigos que lo aceptan ──

describe('P-1: serverMessage tiene precedencia en 400, 409, 422 (PBT)', () => {
  it('P-1: cualquier serverMessage no vacío es retornado tal cual', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(400, 409, 422),
        fc.string({ minLength: 1, maxLength: 200 }),
        (status, msg) => {
          expect(handleApiError(status, msg)).toBe(msg);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── PBT: códigos sin serverMessage siempre retornan string no vacío ──────────

describe('P-2: handleApiError siempre retorna string no vacío (PBT)', () => {
  it('P-2: para cualquier status code, el resultado nunca es vacío', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 599 }),
        (status) => {
          const result = handleApiError(status);
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── PBT: 401, 403, 429, 500 ignoran serverMessage (mensajes fijos) ───────────

describe('P-3: códigos con mensaje fijo ignoran serverMessage (PBT)', () => {
  it('P-3: 401/403/429/500 siempre retornan el mismo mensaje sin importar serverMessage', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(401, 403, 429, 500),
        fc.option(fc.string({ minLength: 1 }), { nil: undefined }),
        (status, msg) => {
          const withMsg = handleApiError(status, msg);
          const withoutMsg = handleApiError(status);
          expect(withMsg).toBe(withoutMsg);
        },
      ),
      { numRuns: 100 },
    );
  });
});
