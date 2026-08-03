import React, { useRef, useEffect } from 'react';

interface OpticalMatrixCanvasProps {
  frameData: Uint8Array[];
  version: number;
  isFullscreen?: boolean;
  onRendered?: () => void;
  onError?: (message: string) => void;
}

export const OpticalMatrixCanvas: React.FC<OpticalMatrixCanvasProps> = ({
  frameData,
  version,
  isFullscreen,
  onRendered,
  onError,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<{ packets: Uint8Array[]; version: number } | null>(null);
  const busyRef = useRef(false);
  const callbacksRef = useRef({ onRendered, onError });

  useEffect(() => {
    callbacksRef.current = { onRendered, onError };
  }, [onRendered, onError]);

  useEffect(() => {
    busyRef.current = false;
    pendingRef.current = null;
    const worker = new Worker(new URL('../workers/qrRenderWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onerror = (event) => {
      busyRef.current = false;
      callbacksRef.current.onError?.(event.message || 'QR renderer failed');
    };
    worker.onmessage = (event: MessageEvent<{ buffer?: ArrayBuffer; side?: number; error?: string }>) => {
      busyRef.current = false;
      if (event.data.error) callbacksRef.current.onError?.(event.data.error);
      else if (event.data.buffer && event.data.side) {
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (canvas && context) {
          canvas.width = event.data.side;
          canvas.height = event.data.side;
          context.putImageData(
            new ImageData(new Uint8ClampedArray(event.data.buffer), event.data.side, event.data.side),
            0,
            0,
          );
          callbacksRef.current.onRendered?.();
        }
      }
      if (pendingRef.current) {
        const next = pendingRef.current;
        pendingRef.current = null;
        busyRef.current = true;
        worker.postMessage(next);
      }
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
      busyRef.current = false;
      pendingRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!frameData.length || !workerRef.current) return;
    const request = { packets: frameData, version };
    if (busyRef.current) {
      pendingRef.current = request;
      return;
    }
    busyRef.current = true;
    workerRef.current.postMessage(request);
  }, [frameData, version]);

  return (
    <div className={`relative flex items-center justify-center bg-white rounded-2xl overflow-hidden ${isFullscreen ? 'w-screen h-screen fixed inset-0 z-50 p-2' : 'w-full aspect-square max-w-[580px] mx-auto'}`}>
      <canvas
        ref={canvasRef}
        width={580}
        height={580}
        className="w-full h-full object-contain image-rendering-pixelated rounded-lg border border-neutral-200"
      />
    </div>
  );
};
