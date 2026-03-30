import { useState, useCallback } from 'react';
import { Camera } from 'expo-camera';
import { evidenceApi } from '../api/evidenceApi';

interface UploadState {
  imageUri: string | null;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
  permissionGranted: boolean | null;
}

interface UseUploadEvidenceReturn extends UploadState {
  requestPermission: () => Promise<void>;
  setImageUri: (uri: string) => void;
  upload: (serviceId: string) => Promise<boolean>;
  reset: () => void;
}

export function useUploadEvidence(): UseUploadEvidenceReturn {
  const [state, setState] = useState<UploadState>({
    imageUri: null,
    uploading: false,
    uploaded: false,
    error: null,
    permissionGranted: null,
  });

  const requestPermission = useCallback(async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setState((s) => ({
      ...s,
      permissionGranted: status === 'granted',
      error: status !== 'granted' ? 'Permiso de cámara denegado' : null,
    }));
  }, []);

  const setImageUri = useCallback((uri: string) => {
    // BUG-06/07 FIX: reset uploaded flag when user retakes photo
    setState((s) => ({ ...s, imageUri: uri || null, uploaded: false, error: null }));
  }, []);

  const upload = useCallback(
    async (serviceId: string): Promise<boolean> => {
      if (!state.imageUri) {
        setState((s) => ({ ...s, error: 'Primero toma una foto' }));
        return false;
      }
      setState((s) => ({ ...s, uploading: true, error: null }));
      try {
        await evidenceApi.upload(serviceId, { image_url: state.imageUri });
        setState((s) => ({ ...s, uploading: false, uploaded: true }));
        return true;
      } catch (err: any) {
        setState((s) => ({
          ...s,
          uploading: false,
          error: err?.userMessage ?? 'Error al subir evidencia',
        }));
        return false;
      }
    },
    [state.imageUri]
  );

  const reset = useCallback(() => {
    setState({ imageUri: null, uploading: false, uploaded: false, error: null, permissionGranted: null });
  }, []);

  return { ...state, requestPermission, setImageUri, upload, reset };
}
