import { useState, useRef, useCallback, useEffect } from 'react';

const CAMERA_STORAGE_KEY = 'lotp-camera-id';
const NOT_READABLE_RETRY_DELAY_MS = 400;
const NOT_READABLE_MAX_RETRIES = 3;

export const cameraSourceConstraints = (deviceId?: string): MediaTrackConstraints =>
  deviceId
    ? { deviceId: { exact: deviceId } }
    : { facingMode: { exact: 'environment' } };

/**
 * Request a camera stream, retrying NotReadableError with linear backoff.
 * Chromium issue 849636 documents spurious NotReadableError spikes; camera
 * hardware is also released asynchronously after track.stop() on Android.
 */
async function requestCameraStream(deviceId?: string): Promise<MediaStream> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= NOT_READABLE_MAX_RETRIES; attempt++) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: cameraSourceConstraints(deviceId),
        audio: false,
      });
    } catch (error) {
      const retriable =
        error instanceof DOMException &&
        error.name === 'NotReadableError' &&
        attempt < NOT_READABLE_MAX_RETRIES;
      if (!retriable) throw error;
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, NOT_READABLE_RETRY_DELAY_MS * (attempt + 1)));
    }
  }
  throw lastError;
}

/**
 * Camera labels are device-localized; these tokens rank physical back lenses.
 * The "wide/main" (1x) lens is preferred over ultrawide (0.5x), macro, tele.
 */
const PREFERRED_LENS_TOKENS = [
  'main', 'wide', '1x', 'back camera', 'rear camera', 'back', 'rear',
  'основн', 'задн', 'тыльн', 'широкоугольн',
];

const AVOIDED_LENS_TOKENS = [
  'ultra', '0.5', 'macro', 'tele', 'zoom', 'front', 'передн',
  'сверхшироко', 'макро', 'теле', 'зум', 'аква',
];

function scoreCameraLabel(label: string): number {
  const lower = label.toLowerCase();
  let score = 0;
  for (const token of AVOIDED_LENS_TOKENS) {
    if (lower.includes(token)) score -= 2;
  }
  for (const token of PREFERRED_LENS_TOKENS) {
    if (lower.includes(token)) score += 1;
  }
  return score;
}

/**
 * Measure the maximum supported video width of a camera. The main (wide, 1x)
 * lens virtually always supports a higher resolution than the ultrawide,
 * macro or telephoto modules, so this is a physical measurement rather than a
 * label guess.
 */
async function measureMaxWidth(deviceId: string): Promise<number> {
  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
      audio: false,
    });
    const track = stream.getVideoTracks()[0];
    return track?.getCapabilities().width?.max ?? 0;
  } catch {
    return 0;
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
  }
}

async function pickBestBackCamera(devices: MediaDeviceInfo[]): Promise<MediaDeviceInfo | undefined> {
  const labeled = devices.filter((device) => device.label);
  if (!labeled.length) return undefined;

  const backCandidates = labeled.filter((device) => !/front|передн/i.test(device.label));
  if (!backCandidates.length) return undefined;

  let best: MediaDeviceInfo | undefined;
  let bestWidth = 0;
  let bestLabelScore = -Infinity;
  for (const device of backCandidates) {
    const maxWidth = await measureMaxWidth(device.deviceId);
    const labelScore = scoreCameraLabel(device.label);
    if (
      !best ||
      maxWidth > bestWidth ||
      (maxWidth === bestWidth && labelScore > bestLabelScore)
    ) {
      best = device;
      bestWidth = maxWidth;
      bestLabelScore = labelScore;
    }
  }
  if (best && bestWidth > 0) return best;

  const scored = backCandidates
    .map((device) => ({ device, score: scoreCameraLabel(device.label) }))
    .sort((a, b) => b.score - a.score);
  if (scored[0]!.score > 0) return scored[0]!.device;
  return backCandidates[0];
}

async function enumerateVideoDevices(): Promise<MediaDeviceInfo[]> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((item) => item.kind === 'videoinput');
  } catch {
    return [];
  }
}

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const openCameraStreamOnce = useCallback(async (deviceId?: string): Promise<MediaStream> => {
    // Release the previous camera first: Android releases the hardware
    // resource asynchronously, and a concurrent request fails NotReadableError.
    streamRef.current?.getTracks().forEach((track) => track.stop());

    const mediaStream = await requestCameraStream(deviceId);

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

    streamRef.current = mediaStream;
    setStream(mediaStream);
    return mediaStream;
  }, []);

  const openCameraStream = useCallback(async (deviceId?: string): Promise<MediaStream> => {
    try {
      return await openCameraStreamOnce(deviceId);
    } catch (cameraError) {
      if (cameraError instanceof DOMException && cameraError.name === 'NotAllowedError') throw cameraError;
      if (deviceId && cameraError instanceof DOMException && cameraError.name === 'NotFoundError') {
        try {
          localStorage.removeItem(CAMERA_STORAGE_KEY);
        } catch {
          // Storage can be unavailable in private browsing; the default camera still works.
        }
        return await openCameraStreamOnce(undefined);
      }
      throw cameraError;
    }
  }, [openCameraStreamOnce]);

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

      const activeDeviceId = streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId;
      if (deviceId && activeDeviceId && deviceId === activeDeviceId) return true;

      let requestedDeviceId = deviceId;
      if (!requestedDeviceId) {
        let storedCameraId = '';
        try {
          storedCameraId = localStorage.getItem(CAMERA_STORAGE_KEY) || '';
        } catch {
          // Storage can be unavailable in private browsing; camera access still works.
        }
        if (storedCameraId && storedCameraId !== activeDeviceId) requestedDeviceId = storedCameraId;
      }

      const openedWithExplicitId = !!requestedDeviceId;
      if (!requestedDeviceId) {
        const picked = await pickBestBackCamera(await enumerateVideoDevices());
        if (picked && picked.deviceId !== activeDeviceId) requestedDeviceId = picked.deviceId;
      }

      let mediaStream = await openCameraStream(requestedDeviceId || undefined);

      if (!openedWithExplicitId && !requestedDeviceId) {
        // The browser picked the lens via facingMode; labels and permissions
        // are now available. Release the camera, measure every back lens and
        // reopen the one with the highest supported resolution.
        const currentId = mediaStream.getVideoTracks()[0]?.getSettings().deviceId;
        const devices = await enumerateVideoDevices();
        const best = await pickBestBackCamera(devices);
        if (best && best.deviceId !== currentId) {
          mediaStream.getTracks().forEach((track) => track.stop());
          mediaStream = await openCameraStream(best.deviceId);
        }
      }

      const track = mediaStream.getVideoTracks()[0];
      const activeCameraId = track?.getSettings().deviceId || requestedDeviceId;
      setSelectedCameraId(activeCameraId || '');
      if (!deviceId && activeCameraId) {
        try {
          localStorage.setItem(CAMERA_STORAGE_KEY, activeCameraId);
        } catch {
          // The selected camera remains active even when it cannot be persisted.
        }
      }

      const devices = await enumerateVideoDevices();
      setCameras(devices);
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
  }, [openCameraStream]);

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
