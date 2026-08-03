import React, { useEffect, useRef } from 'react';
import type { Quadrilateral } from '../optical/detector/cornerDetector';
import { AlertCircle } from 'lucide-react';

interface CameraViewfinderProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  quad: Quadrilateral | null;
  tips: string[];
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({ videoRef, quad, tips }) => {
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (quad) {
      ctx.beginPath();
      ctx.moveTo(quad.tl.x, quad.tl.y);
      ctx.lineTo(quad.tr.x, quad.tr.y);
      ctx.lineTo(quad.br.x, quad.br.y);
      ctx.lineTo(quad.bl.x, quad.bl.y);
      ctx.closePath();

      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
      ctx.fill();

      const drawDot = (pt: { x: number; y: number }) => {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#10B981';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      };

      drawDot(quad.tl);
      drawDot(quad.tr);
      drawDot(quad.br);
      drawDot(quad.bl);
    }
  }, [quad, videoRef]);

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-neutral-800 shadow-2xl aspect-video flex items-center justify-center">
      <video
        ref={videoRef as any}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <canvas
        ref={overlayCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {!quad && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 border-2 border-dashed border-emerald-500/40 rounded-3xl flex items-center justify-center animate-pulse">
            <div className="w-48 h-48 border border-emerald-500/20 rounded-2xl" />
          </div>
        </div>
      )}

      {tips.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 bg-neutral-900/90 backdrop-blur-md border border-amber-500/40 p-3 rounded-xl flex items-center gap-2.5 text-xs text-amber-300 shadow-lg animate-fade-in">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="flex-1 font-mono font-medium">{tips[0]}</div>
        </div>
      )}
    </div>
  );
};
