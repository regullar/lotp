import { useState, useRef, useCallback, useEffect } from 'react';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
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
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = mediaStream;
      setStream(mediaStream);
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
    videoRef,
    startCamera,
    stopCamera,
  };
}
