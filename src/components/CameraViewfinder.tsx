import React from 'react';

interface CameraViewfinderProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  detected: boolean;
}

export const CameraViewfinder: React.FC<CameraViewfinderProps> = ({ videoRef, detected }) => (
    <div className="relative rounded-2xl overflow-hidden bg-black border border-neutral-800 shadow-2xl aspect-[4/3] flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`h-[72%] aspect-square rounded-3xl border-2 transition-colors ${
          detected
            ? 'border-emerald-400'
            : 'border-dashed border-cyan-400/70 animate-pulse'
        }`}>
          <div className="m-[12.5%] h-3/4 rounded-2xl border border-white/20" />
        </div>
      </div>
    </div>
  );
