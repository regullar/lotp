import React from 'react';
import { Info, Zap, Shield, Layers, FileCode, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

export const AboutPage: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-8">
      {/* Title */}
      <div className="bg-neutral-900/80 rounded-3xl border border-neutral-800 p-8 space-y-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">LOTP v1 Protocol Architecture</h2>
            <p className="text-xs text-neutral-400">LumenLink Optical Transport Protocol Specification & Technical Explainer</p>
          </div>
        </div>
      </div>

      {/* Why QR Sequences Fail */}
      <div className="bg-neutral-900/80 rounded-3xl border border-neutral-800 p-8 space-y-4 shadow-2xl">
        <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
          Why Standard QR Code Sequences Fail Over Video
        </h3>
        <p className="text-xs text-neutral-300 leading-relaxed">
          Standard QR codes were engineered for static scanning of single items (URLs, tickets, contacts). When played sequentially over a screen at 30-60 FPS, standard QR codes fail catastrophically due to four fundamental physical limitations:
        </p>
        <ul className="list-disc list-inside text-xs text-neutral-400 space-y-2 pl-2">
          <li><strong className="text-white">Lack of Reverse Channel:</strong> The camera cannot signal the screen to pause or retransmit a missed frame. Losing frame #47 breaks the entire sequential download.</li>
          <li><strong className="text-white">Rolling Shutter Split:</strong> CMOS camera sensors scan line-by-line. A single video frame often contains the top half of frame N and bottom half of frame N+1, corrupting QR finder patterns.</li>
          <li><strong className="text-white">Fixed Format Overhead:</strong> Standard QR codes repeat massive static metadata headers in every frame, wasting 40% of optical throughput.</li>
          <li><strong className="text-white">Symmetric Corner Ambiguity:</strong> Standard QR uses identical finder patterns in 3 corners. When rotated or viewed under acute camera angles, orientation detection fails.</li>
        </ul>
      </div>

      {/* LOTP v1 Solution Architecture */}
      <div className="bg-neutral-900/80 rounded-3xl border border-neutral-800 p-8 space-y-6 shadow-2xl">
        <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
          The LOTP v1 Architecture Solution
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              1. 4 Asymmetric Corner Fiducial Markers
            </div>
            <p className="text-neutral-400">
              Each corner features a unique binary pattern (TL, TR, BL, BR), enabling instant, unambiguous homography perspective computation without orientation ambiguity.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              2. Systematic LT Fountain Codes
            </div>
            <p className="text-neutral-400">
              Files are encoded into infinite streamable fountain symbols using Robust Soliton distribution. Receiving ANY 105% subset of symbols recovers the complete file!
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              3. Inner Reed-Solomon & 2D Interleaving
            </div>
            <p className="text-neutral-400">
              Data tiles carry Galois Field GF(2^8) Reed-Solomon ECC and 2D deterministic matrix interleaving. Screen glares or rolling shutter lines won't destroy consecutive code words.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-rose-400" />
              4. Zero-Server Privacy Model
            </div>
            <p className="text-neutral-400">
              Operates as an offline PWA. Data never leaves local device memory or touches any external server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
