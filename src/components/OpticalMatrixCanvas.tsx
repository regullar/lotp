import React, { useRef, useEffect } from 'react';
import { MatrixRenderer } from '../optical/renderer/matrixRenderer';
import { PaletteMode } from '../protocol/constants';

interface OpticalMatrixCanvasProps {
  rows: number;
  cols: number;
  paletteMode: PaletteMode;
  headerData: Uint8Array;
  tilesData: Uint8Array[];
  isFullscreen?: boolean;
}

export const OpticalMatrixCanvas: React.FC<OpticalMatrixCanvasProps> = ({
  rows,
  cols,
  paletteMode,
  headerData,
  tilesData,
  isFullscreen,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    MatrixRenderer.renderFrame({
      canvas,
      rows,
      cols,
      paletteMode,
      headerData,
      tilesData,
    });
  }, [rows, cols, paletteMode, headerData, tilesData]);

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
