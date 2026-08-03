import React, { useState, useRef } from 'react';
import { FileSelector } from '../components/FileSelector';
import { OpticalMatrixCanvas } from '../components/OpticalMatrixCanvas';
import { MetricCard } from '../components/MetricCard';
import { PaletteMode } from '../protocol/constants';
import { LOTPContainer } from '../protocol/container/lotpContainer';
import { ManifestSerializer } from '../protocol/manifest';
import {
  createRaptorTransfer,
  DEFAULT_RAPTOR_SETTINGS,
  getRaptorCapacity,
  RAPTOR_REPAIR_PERCENT,
  type RaptorSettings,
} from '../protocol/raptorTransport';
import { LOTPCrypto } from '../protocol/crypto/aesgcm';
import { compressIfUseful } from '../protocol/compression';
import { useI18n } from '../hooks/useI18n';
import { Play, Pause, Maximize2, ShieldAlert, ArrowLeft } from 'lucide-react';

interface SendPageProps {
  setActiveTab: (tab: string) => void;
}

export const SendPage: React.FC<SendPageProps> = ({ setActiveTab }) => {
  const { t } = useI18n();

  const [files, setFiles] = useState<File[]>([]);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [transmissionError, setTransmissionError] = useState<string | null>(null);

  const [symbolId, setSymbolId] = useState<number>(0);
  const [totalK, setTotalK] = useState<number>(0);
  const [currentFPS, setCurrentFPS] = useState<number>(0);
  const [avgSpeedBps, setAvgSpeedBps] = useState<number>(0);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  const [frameData, setFrameData] = useState<Uint8Array[]>([]);

  const packetsRef = useRef<Uint8Array[]>([]);
  const initialOrderRef = useRef<number[]>([]);
  const loopOrderRef = useRef<number[]>([]);
  const nextFrameRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const transmittingRef = useRef(false);
  const pausedRef = useRef(false);
  const lastRenderedRef = useRef<number>(0);
  const renderStartedRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const activeSettingsRef = useRef<RaptorSettings>(DEFAULT_RAPTOR_SETTINGS);
  const sourceBytesRef = useRef(0);

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const startTransmission = async (settings: RaptorSettings) => {
    if (files.length === 0) return;
    setTransmissionError(null);

    try {
      const fileItems = await Promise.all(
        files.map(async (f) => ({
          file: f,
          data: new Uint8Array(await f.arrayBuffer()),
        }))
      );

      const packedContainer = await LOTPContainer.pack(fileItems);
      const compression = await compressIfUseful(packedContainer);
      const isCompressed = compression.compressed;
      let containerData = compression.data;

      let cryptoMeta: { saltHex: string; noncePrefixHex: string } | undefined;
      if (isEncrypted && password) {
        const encrypted = await LOTPCrypto.encrypt(containerData, password);
        containerData = encrypted.ciphertext;
        cryptoMeta = {
          saltHex: Array.from(encrypted.salt).map((b) => b.toString(16).padStart(2, '0')).join(''),
          noncePrefixHex: Array.from(encrypted.noncePrefix).map((b) => b.toString(16).padStart(2, '0')).join(''),
        };
      }

      const sessionId = crypto.getRandomValues(new Uint32Array(1))[0] || 1;
      const capacity = getRaptorCapacity(settings.version);
      const manifest = await ManifestSerializer.create(
        String(sessionId),
        fileItems,
        containerData,
        capacity.sourceBytes,
        `raptor-v${settings.version}-l`,
        PaletteMode.MONO_1BIT,
        isEncrypted,
        cryptoMeta,
        isCompressed,
      );
      const manifestBytes = ManifestSerializer.encode(manifest);
      const transferData = new Uint8Array(manifestBytes.length + containerData.length);
      transferData.set(manifestBytes);
      transferData.set(containerData, manifestBytes.length);

      const transfer = await createRaptorTransfer(transferData, sessionId, settings);
      packetsRef.current = transfer.packets;
      initialOrderRef.current = transfer.initialOrder;
      loopOrderRef.current = transfer.loopOrder;
      nextFrameRef.current = 1;
      activeSettingsRef.current = { ...settings };
      sourceBytesRef.current = transfer.sourceBytes;
      setTotalK(transfer.sourcePackets);
      setSymbolId(0);

      startTimeRef.current = performance.now();
      lastRenderedRef.current = 0;
      renderStartedRef.current = performance.now();
      transmittingRef.current = true;
      pausedRef.current = false;
      setIsTransmitting(true);
      setIsPaused(false);
      setFrameData(getDisplayFrame(0));
    } catch (startError) {
      setTransmissionError(startError instanceof Error ? startError.message : 'Не удалось подготовить передачу.');
    }
  };

  const getDisplayFrame = (frameIndex: number): Uint8Array[] => {
    const initial = initialOrderRef.current;
    const loop = loopOrderRef.current;
    const parallel = activeSettingsRef.current.parallel;
    const frameCount = Math.ceil(initial.length / parallel);
    const order = frameIndex < frameCount ? initial : loop;
    const start = (frameIndex % frameCount) * parallel;
    return Array.from({ length: parallel }, (_, tile) =>
      packetsRef.current[order[(start + tile) % order.length]],
    );
  };

  const queueNextFrame = () => {
    if (!transmittingRef.current || pausedRef.current) return;
    const frameIndex = nextFrameRef.current++;
    renderStartedRef.current = performance.now();
    setFrameData(getDisplayFrame(frameIndex));
  };

  const handleRendered = () => {
    if (!transmittingRef.current) return;
    const activeSettings = activeSettingsRef.current;
    const now = performance.now();
    const delta = lastRenderedRef.current ? now - lastRenderedRef.current : 1000 / activeSettings.fps;
    lastRenderedRef.current = now;
    const shown = nextFrameRef.current * activeSettings.parallel;
    const elapsed = (now - startTimeRef.current) / 1000;
    setSymbolId(shown);
    setElapsedSec(Math.round(elapsed));
    setCurrentFPS(Math.min(activeSettings.fps, Math.round(1000 / Math.max(1, delta))));
    setAvgSpeedBps(Math.round(shown * sourceBytesRef.current / Math.max(1, elapsed)));
    if (!pausedRef.current) {
      const renderTime = now - renderStartedRef.current;
      timerRef.current = window.setTimeout(queueNextFrame, Math.max(0, 1000 / activeSettings.fps - renderTime));
    }
  };

  const togglePause = () => {
    const nextPaused = !pausedRef.current;
    pausedRef.current = nextPaused;
    setIsPaused(nextPaused);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (!nextPaused) queueNextFrame();
  };

  const stopTransmission = () => {
    transmittingRef.current = false;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setIsTransmitting(false);
  };

  const redundancyPercent = totalK > 0
    ? Math.min(RAPTOR_REPAIR_PERCENT, Math.max(0, Math.round((symbolId / totalK - 1) * 100)))
    : 0;

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <button
        type="button"
        onClick={() => setActiveTab('send')}
        className="flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {!isTransmitting ? (
        <div className="bg-neutral-900/80 rounded-3xl border border-neutral-800 p-6 sm:p-8 space-y-6 shadow-2xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {t.sendFile}
          </h2>

          <FileSelector
            files={files}
            onFilesSelected={handleFilesSelected}
            onRemoveFile={handleRemoveFile}
            isEncrypted={isEncrypted}
            onEncryptionToggle={setIsEncrypted}
            password={password}
            onPasswordChange={setPassword}
            onStart={startTransmission}
          />
          {transmissionError && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {transmissionError}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-neutral-900/90 rounded-3xl border border-neutral-800 p-6 flex flex-col items-center gap-6 shadow-2xl">
            <OpticalMatrixCanvas
              frameData={frameData}
              version={activeSettingsRef.current.version}
              isFullscreen={isFullscreen}
              onRendered={handleRendered}
              onError={setTransmissionError}
            />

            {transmissionError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                {transmissionError}
              </div>
            )}

            <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl text-xs text-neutral-400 max-w-md text-center">
              <ShieldAlert className="w-4 h-4 text-emerald-400 inline mr-1.5" />
              RaptorQ добавляет 20% ремонтных пакетов; поток повторяется до полного восстановления.
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={isPaused ? 'Resume transmission' : 'Pause transmission'}
                onClick={togglePause}
                className="p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
              >
                {isPaused ? <Play className="w-5 h-5 fill-current" /> : <Pause className="w-5 h-5" />}
              </button>
              <button
                type="button"
                aria-label="Toggle fullscreen"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={stopTransmission}
                className="px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold font-mono transition-colors"
              >
                {t.stopTransmission}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricCard
              label={t.generatedRedundancy}
              value={`${redundancyPercent}%`}
              subtext={`${symbolId} QR shown · ${totalK} source`}
              accent="emerald"
            />
            <MetricCard
              label="Display FPS"
              value={currentFPS}
              subtext={`Target ${activeSettingsRef.current.fps} FPS`}
              accent="cyan"
            />
            <MetricCard
              label={t.avgSpeed}
              value={`${(avgSpeedBps / 1024).toFixed(1)} KB/s`}
              accent="neutral"
            />
            <MetricCard
              label="Elapsed Time"
              value={`${elapsedSec}s`}
              accent="neutral"
            />
          </div>
        </div>
      )}
    </div>
  );
};
