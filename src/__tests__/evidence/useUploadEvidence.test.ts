import * as fc from 'fast-check';
import { renderHook, act } from '@testing-library/react-native';
import { useUploadEvidence } from '@/features/evidence/hooks/useUploadEvidence';
import { evidenceApi } from '@/features/evidence/api/evidenceApi';
import { Camera } from 'expo-camera';

jest.mock('expo-camera', () => ({
  Camera: { requestCameraPermissionsAsync: jest.fn() },
  CameraView: 'CameraView',
}));
jest.mock('@/features/evidence/api/evidenceApi');

// ─── Estado inicial ───────────────────────────────────────────────────────────

describe('useUploadEvidence — estado inicial', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inicia sin imagen, sin subir, sin error', () => {
    const { result } = renderHook(() => useUploadEvidence());
    expect(result.current.imageUri).toBeNull();
    expect(result.current.uploaded).toBe(false);
    expect(result.current.uploading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

// ─── requestPermission ────────────────────────────────────────────────────────

describe('useUploadEvidence — requestPermission', () => {
  beforeEach(() => jest.clearAllMocks());

  it('permissionGranted=true cuando el usuario acepta', async () => {
    (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    const { result } = renderHook(() => useUploadEvidence());
    await act(async () => { await result.current.requestPermission(); });
    expect(result.current.permissionGranted).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('permissionGranted=false y error cuando el usuario deniega', async () => {
    (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useUploadEvidence());
    await act(async () => { await result.current.requestPermission(); });
    expect(result.current.permissionGranted).toBe(false);
    expect(result.current.error).toBe('Permiso de cámara denegado');
  });
});

// ─── setImageUri ──────────────────────────────────────────────────────────────

describe('useUploadEvidence — setImageUri', () => {
  beforeEach(() => jest.clearAllMocks());

  it('actualiza imageUri', () => {
    const { result } = renderHook(() => useUploadEvidence());
    act(() => { result.current.setImageUri('file://photo.jpg'); });
    expect(result.current.imageUri).toBe('file://photo.jpg');
  });
});

// ─── upload ───────────────────────────────────────────────────────────────────

describe('useUploadEvidence — upload', () => {
  beforeEach(() => jest.clearAllMocks());

  it('falla con error cuando no hay imagen', async () => {
    const { result } = renderHook(() => useUploadEvidence());
    let ok = true;
    await act(async () => { ok = await result.current.upload('svc-1'); });
    expect(ok).toBe(false);
    expect(result.current.error).toBe('Primero toma una foto');
  });

  it('sube correctamente y marca uploaded=true', async () => {
    (evidenceApi.upload as jest.Mock).mockResolvedValue({ id: 'ev-1' });
    const { result } = renderHook(() => useUploadEvidence());
    act(() => { result.current.setImageUri('file://photo.jpg'); });
    let ok = false;
    await act(async () => { ok = await result.current.upload('svc-1'); });
    expect(ok).toBe(true);
    expect(result.current.uploaded).toBe(true);
    expect(evidenceApi.upload).toHaveBeenCalledWith('svc-1', 'file://photo.jpg');
  });

  it('retorna false y establece error cuando la API falla', async () => {
    (evidenceApi.upload as jest.Mock).mockRejectedValue({ userMessage: 'Error al subir' });
    const { result } = renderHook(() => useUploadEvidence());
    act(() => { result.current.setImageUri('file://photo.jpg'); });
    let ok = true;
    await act(async () => { ok = await result.current.upload('svc-1'); });
    expect(ok).toBe(false);
    expect(result.current.error).toBe('Error al subir');
    expect(result.current.uploaded).toBe(false);
  });
});

// ─── reset ────────────────────────────────────────────────────────────────────

describe('useUploadEvidence — reset', () => {
  beforeEach(() => jest.clearAllMocks());

  it('limpia todo el estado tras una subida exitosa', async () => {
    (evidenceApi.upload as jest.Mock).mockResolvedValue({});
    const { result } = renderHook(() => useUploadEvidence());
    act(() => { result.current.setImageUri('file://photo.jpg'); });
    await act(async () => { await result.current.upload('svc-1'); });
    act(() => { result.current.reset(); });
    expect(result.current.imageUri).toBeNull();
    expect(result.current.uploaded).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('reset desde estado inicial no lanza error', () => {
    const { result } = renderHook(() => useUploadEvidence());
    expect(() => act(() => { result.current.reset(); })).not.toThrow();
  });
});

// ─── PBT: upload sin imagen siempre falla ────────────────────────────────────

describe('P-1: upload sin imagen siempre retorna false (PBT)', () => {
  it('P-1: cualquier serviceId sin imagen → upload retorna false', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (serviceId) => {
          jest.clearAllMocks();
          const { result } = renderHook(() => useUploadEvidence());
          let ok = true;
          await act(async () => { ok = await result.current.upload(serviceId); });
          expect(ok).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── PBT: reset siempre deja imageUri=null ────────────────────────────────────

describe('P-2: reset siempre limpia imageUri (PBT)', () => {
  it('P-2: cualquier URI seguido de reset → imageUri es null', () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        (uri) => {
          const { result } = renderHook(() => useUploadEvidence());
          act(() => { result.current.setImageUri(uri); });
          act(() => { result.current.reset(); });
          expect(result.current.imageUri).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
