import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { CameraViewfinder } from '../components/CameraViewfinder';
import { SignalQualityBadge, SignalLevel } from '../components/SignalQualityBadge';
import { MetricCard } from '../components/MetricCard';
import { useCamera } from '../hooks/useCamera';
import { FrameType } from '../protocol/constants';
import { ManifestSerializer, SessionManifest } from '../protocol/manifest';
import { LTPeelingDecoder } from '../protocol/fountain/peeling';
import { LOTPContainer, ContainerFile } from '../protocol/container/lotpContainer';
import { LOTPCrypto } from '../protocol/crypto/aesgcm';
import { Quadrilateral } from '../optical/detector/cornerDetector';
import { useI18n } from '../hooks/useI18n';
import { Camera, CheckCircle2, Download, AlertTriangle, ArrowLeft } from 'lucide-react';

interface ReceivePageProps {
  setActiveTab: (tab: string) => void;
}

export const ReceivePage: React.FC<ReceivePageProps> = ({ setActiveTab }) => {
  const { t } = useI18n();
  const { stream, error, videoRef, startCamera, stopCamera } = useCamera();

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [quad, setQuad] = useState<Quadrilateral | null>(null);
  const [signalLevel, setSignalLevel] = useState<SignalLevel>('searching');
  const [tips, setTips] = useState<string[]>([]);

  // Session state
  const [manifest, setManifest] = useState<SessionManifest | null>(null);
  const [decoder, setDecoder] = useState<LTPeelingDecoder | null>(null);
  const [decryptedPassword] = useState<string>('');
  const [, setRequiresPassword] = useState<boolean>(false);

  // Stats
  const [framesRead, setFramesRead] = useState<number>(0);
  const [framesCorrupted, setFramesCorrupted] = useState<number>(0);
  const [cameraFPS, setCameraFPS] = useState<number>(0);
  const [recoveryProgress, setRecoveryProgress] = useState<number>(0);

  // Completed Files
  const [restoredFiles, setRestoredFiles] = useState<ContainerFile[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const workerRef = useRef<Worker | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const worker = new Worker(new URL('../workers/scannerWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;

    worker.onmessage = (e) => {
      const data = e.data;

      if (data.type === 'NO_QUAD') {
        setQuad(null);
        setSignalLevel('searching');
        setTips([t.tips.bringCloser]);
        return;
      }

      if (data.type === 'FRAME_PROCESSED') {
        setQuad(data.quad);
        setSignalLevel(data.confidence > 0.6 ? 'excellent' : 'good');
        setTips([]);
        setFramesRead((prev) => prev + 1);

        const { header, tile } = data;
        if (!header || !tile) {
          setFramesCorrupted((prev) => prev + 1);
          return;
        }

        if (header.frameType === FrameType.MANIFEST && !manifest) {
          const parsedManifest = ManifestSerializer.decode(tile.payload);
          if (parsedManifest) {
            setManifest(parsedManifest);
            const peeler = new LTPeelingDecoder(
              parsedManifest.totalBlocks,
              parsedManifest.blockSize,
              parsedManifest.totalSize
            );
            setDecoder(peeler);
            if (parsedManifest.isEncrypted) {
              setRequiresPassword(true);
            }
          }
        }

        if (header.frameType === FrameType.DATA && decoder && tile) {
          const finished = decoder.addSymbol({
            symbolId: tile.symbolId,
            seed: tile.symbolId * 2654435761,
            degree: 1,
            blockIndices: [tile.symbolId % decoder.getTotalBlocks()],
            data: tile.payload,
          });

          const prog = decoder.getProgress();
          setRecoveryProgress(Math.round(prog * 100));

          if (finished && !isCompleted) {
            finishReconstruction();
          }
        }
      }
    };

    return () => {
      worker.terminate();
    };
  }, [decoder, manifest, isCompleted]);

  const finishReconstruction = async () => {
    if (!decoder || !manifest) return;
    const rawContainer = decoder.reconstruct();
    if (!rawContainer) return;

    let payloadBytes = rawContainer;

    if (manifest.isEncrypted) {
      if (!decryptedPassword) {
        setRequiresPassword(true);
        return;
      }

      try {
        const salt = new Uint8Array(manifest.saltHex!.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
        const noncePrefix = new Uint8Array(manifest.noncePrefixHex!.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
        payloadBytes = await LOTPCrypto.decrypt({ salt, noncePrefix, ciphertext: rawContainer }, decryptedPassword);
      } catch {
        alert('Incorrect encryption password!');
        return;
      }
    }

    const files = await LOTPContainer.unpack(payloadBytes);
    setRestoredFiles(files);
    setIsCompleted(true);
    setIsScanning(false);
    stopCamera();

    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
  };

  const handleStartScanning = async () => {
    await startCamera();
    setIsScanning(true);
    setIsCompleted(false);
    setFramesRead(0);
    setFramesCorrupted(0);
  };

  useEffect(() => {
    if (!isScanning || !videoRef.current || !workerRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');

    const processFrame = (timestamp: number) => {
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      setCameraFPS(Math.round(1000 / Math.max(1, delta)));

      if (videoRef.current && ctx && videoRef.current.readyState >= 2) {
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);
        const imgData = ctx.getImageData(0, 0, 640, 480);
        workerRef.current?.postMessage({
          imageData: imgData,
          rows: 16,
          cols: 16,
          paletteMode: 0,
          rsEccBytes: 8,
        });
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isScanning, videoRef]);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <button
        onClick={() => setActiveTab('send')}
        className="flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {!stream && !isCompleted ? (
        <div className="bg-neutral-900/80 rounded-3xl border border-neutral-800 p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mx-auto">
            <Camera className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">{t.receiveFile}</h2>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Allow camera access to align and decode the optical matrix feed from the sender device.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 max-w-md mx-auto text-left">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>{error}</div>
            </div>
          )}

          <button
            onClick={handleStartScanning}
            className="px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm tracking-wide shadow-lg shadow-cyan-500/20 transition-all"
          >
            {t.cameraAccess}
          </button>
        </div>
      ) : isCompleted ? (
        <div className="bg-neutral-900/90 rounded-3xl border border-emerald-500/40 p-8 space-y-6 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white">{t.fileRestored}</h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t.verifyHash}
          </div>

          <div className="space-y-3 max-w-lg mx-auto">
            {restoredFiles.map((file, idx) => {
              const blob = new Blob([file.data as any], { type: file.mimeType });
              const url = URL.createObjectURL(blob);
              return (
                <div key={idx} className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
                  <div className="text-left truncate">
                    <div className="font-semibold text-sm text-white truncate">{file.name}</div>
                    <div className="text-xs text-neutral-400 font-mono">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <a
                    href={url}
                    download={file.name}
                    className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    {t.downloadFile}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <SignalQualityBadge level={signalLevel} confidence={quad?.confidence} />
            <button
              onClick={() => {
                stopCamera();
                setIsScanning(false);
              }}
              className="text-xs font-mono text-neutral-400 hover:text-rose-400 transition-colors"
            >
              Stop Camera
            </button>
          </div>

          <CameraViewfinder videoRef={videoRef} quad={quad} tips={tips} />

          <div className="bg-neutral-900/80 rounded-2xl border border-neutral-800 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400">{t.reconstructionProgress}</span>
              <span className="text-emerald-400 font-bold">{recoveryProgress}%</span>
            </div>
            <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-300"
                style={{ width: `${recoveryProgress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard label={t.cameraFPS} value={cameraFPS} accent="cyan" />
            <MetricCard label={t.framesRead} value={framesRead} accent="neutral" />
            <MetricCard label={t.framesCorrupted} value={framesCorrupted} accent="rose" />
            <MetricCard label={t.fountainBlocks} value={`${decoder?.getSolvedCount() || 0}/${decoder?.getTotalBlocks() || 0}`} accent="emerald" />
          </div>
        </div>
      )}
    </div>
  );
};
