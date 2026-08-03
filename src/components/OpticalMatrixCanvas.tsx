import React, { useRef, useEffect } from 'react';
import QRCode from 'qrcode';

interface OpticalMatrixCanvasProps {
  frameData: Uint8Array;
  isFullscreen?: boolean;
}

export const OpticalMatrixCanvas: React.FC<OpticalMatrixCanvasProps> = ({
  frameData,
  isFullscreen,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!frameData.length) return;
    const segment = { data: frameData, mode: 'byte' } as unknown as QRCode.QRCodeSegment;
    void QRCode.toCanvas(canvas, [segment], {
      width: 512,
      margin: 4,
      errorCorrectionLevel: 'L',
      color: { dark: '#000000', light: '#FFFFFF' },
    }).catch(() => {
      const context = canvas.getContext('2d');
      context?.clearRect(0, 0, canvas.width, canvas.height);
      if (context) {
        context.fillStyle = '#991b1b';
        context.font = 'bold 24px sans-serif';
        context.fillText('QR generation failed', 120, 256);
      }
    });
  }, [frameData]);

  return (
    <div className={`relative flex items-center justify-center bg-white p-4 rounded-2xl shadow-2xl ${isFullscreen ? 'w-screen h-screen fixed inset-0 z-50 p-8' : 'w-full aspect-square max-w-md mx-auto'}`}>
      <canvas
        ref={canvasRef}
        width={512}
        height={512}
        className="w-full h-full object-contain image-rendering-pixelated rounded-lg border border-neutral-200"
      />
    </div>
  );
};
