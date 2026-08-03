import { useState, useRef, useCallback, useEffect } from 'react';

const CAMERA_STORAGE_KEY = 'lotp-camera-id';

export const cameraSourceConstraints = (deviceId?: string): MediaTrackConstraints =>
  deviceId
    ? { deviceId: { exact: deviceId } }
    : { facingMode: { exact: 'environment' } };

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async (deviceId?: string) => {
    if (!window.isSecureContext) {
      setError('Chrome разрешает камеру на телефоне только по HTTPS. Откройте защищённую версию сайта.');
      return false;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Этот браузер не поддерживает доступ к камере.');
      return false;
    }

    try {
      setError(null);
      let storedCameraId = '';
      if (!deviceId) {
        try {
          storedCameraId = localStorage.getItem(CAMERA_STORAGE_KEY) || '';
        } catch {
          // Storage can be unavailable in private browsing; camera access still works.
        }
      }

      const requestedCameraId = deviceId || storedCameraId;
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: cameraSourceConstraints(requestedCameraId || undefined),
          audio: false,
        });
      } catch (cameraError) {
        if (cameraError instanceof DOMException && cameraError.name === 'NotAllowedError') throw cameraError;
        if (!storedCameraId || deviceId) throw cameraError;
        try {
          localStorage.removeItem(CAMERA_STORAGE_KEY);
        } catch {
          // Ignore unavailable storage and retry the default rear camera.
        }
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: cameraSourceConstraints(),
          audio: false,
        });
      }

      const track = mediaStream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities() as MediaTrackCapabilities & {
          zoom?: { min: number; max: number };
        };
        const zoom = capabilities.zoom;
        const constraints: MediaTrackConstraints = {
          width: { ideal: 1920 },
          height: { ideal: 1440 },
          frameRate: { ideal: 30, max: 30 },
          ...(zoom && zoom.min <= 1 && zoom.max >= 1
            ? { advanced: [{ zoom: 1 } as MediaTrackConstraintSet] }
            : {}),
        };
        await track.applyConstraints(constraints).catch(() => {});
      }

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = mediaStream;
      setStream(mediaStream);

      const activeCameraId = track?.getSettings().deviceId || requestedCameraId;
      setSelectedCameraId(activeCameraId);
      if (deviceId) {
        try {
          localStorage.setItem(CAMERA_STORAGE_KEY, activeCameraId);
        } catch {
          // The selected camera remains active even when it cannot be persisted.
        }
      }

      navigator.mediaDevices.enumerateDevices()
        .then((devices) => setCameras(devices.filter((item) => item.kind === 'videoinput')))
        .catch(() => setCameras([]));
      return true;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      const messages: Record<string, string> = {
        NotAllowedError: 'Доступ к камере запрещён. Разрешите его в настройках сайта Chrome и попробуйте снова.',
        NotFoundError: 'Камера на устройстве не найдена.',
        NotReadableError: 'Камера занята другим приложением. Закройте его и попробуйте снова.',
      };
      setError(messages[name] || (err instanceof Error ? err.message : 'Не удалось открыть камеру.'));
      return false;
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  return {
    stream,
    error,
    cameras,
    selectedCameraId,
    videoRef,
    startCamera,
    selectCamera: startCamera,
    stopCamera,
  };
}
