import { useState, useRef, useCallback, useEffect } from 'react';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);

      // Check Secure Context requirement (HTTPS or localhost)
      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        setError(
          'Камера заблокирована браузером: для доступа к камере требуется HTTPS соединение или localhost. Откройте сайт через HTTPS.'
        );
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Ваш браузер не поддерживает доступ к камере (MediaDevices API).');
        return;
      }

      let mediaStream: MediaStream | null = null;

      // Primary attempt: Rear environment camera
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback attempt: Basic video stream
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setStream(mediaStream);
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setError(
          'Доступ к камере заблокирован в настройках сайта. Нажмите на иконку замка/настроек слева от адресной строки браузера и сбросьте разрешение для Камеры.'
        );
      } else {
        setError(err?.message || 'Не удалось включить камеру.');
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  }, [stream]);

  useEffect(() => {
    if (stream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.muted = true;
      video.play().catch((e) => console.warn('Video auto-play deferred:', e));
    }
  }, [stream, videoRef.current]);

  return {
    stream,
    error,
    videoRef,
    startCamera,
    stopCamera,
  };
}
