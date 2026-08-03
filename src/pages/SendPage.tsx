import React, { useState, useEffect, useRef } from 'react';
import { FileSelector } from '../components/FileSelector';
import { OpticalMatrixCanvas } from '../components/OpticalMatrixCanvas';
import { MetricCard } from '../components/MetricCard';
import { PROFILES, FrameType, PaletteMode } from '../protocol/constants';
import { LOTPContainer } from '../protocol/container/lotpContainer';
import { ManifestSerializer } from '../protocol/manifest';
import { LTEncoder } from '../protocol/fountain/ltcode';
import { FrameBuilder } from '../protocol/frame';
import { TilePacker } from '../protocol/tile';
import { LOTPCrypto } from '../protocol/crypto/aesgcm';
import { useI18n } from '../hooks/useI18n';
import { Play, Pause, Maximize2, ShieldAlert, ArrowLeft } from 'lucide-react';

interface SendPageProps {
  setActiveTab: (tab: string) => void;
}

export const SendPage: React.FC<SendPageProps> = ({ setActiveTab }) => {
  const { t } = useI18n();

  const [files, setFiles] = useState<File[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('reliable');
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [isTransmitting, setIsTransmitting] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [symbolId, setSymbolId] = useState<number>(0);
  const [totalK, setTotalK] = useState<number>(0);
  const [currentFPS, setCurrentFPS] = useState<number>(0);
  const [avgSpeedBps, setAvgSpeedBps] = useState<number>(0);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  const [headerData, setHeaderData] = useState<Uint8Array>(() => new Uint8Array(11));
  const [tilesData, setTilesData] = useState<Uint8Array[]>([]);

  const encoderRef = useRef<LTEncoder | null>(null);
  const manifestChunksRef = useRef<Uint8Array[]>([]);
  const manifestChunkIndexRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const frameSeqRef = useRef<number>(0);

  const profile = PROFILES[selectedProfile] || PROFILES.reliable;

  const handleFilesSelected = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const startTransmission = async () => {
    if (files.length === 0) return;

    const fileItems = await Promise.all(
      files.map(async (f) => ({
        file: f,
        data: new Uint8Array(await f.arrayBuffer()),
      }))
    );

    let containerData = await LOTPContainer.pack(fileItems);

    let cryptoMeta: { saltHex: string; noncePrefixHex: string } | undefined;
    if (isEncrypted && password) {
      const encrypted = await LOTPCrypto.encrypt(containerData, password);
      containerData = encrypted.ciphertext;
      cryptoMeta = {
        saltHex: Array.from(encrypted.salt).map((b) => b.toString(16).padStart(2, '0')).join(''),
        noncePrefixHex: Array.from(encrypted.noncePrefix).map((b) => b.toString(16).padStart(2, '0')).join(''),
      };
    }

    const sessionId = Math.random().toString(36).substring(2, 18);
    const manifest = await ManifestSerializer.create(
      sessionId,
      fileItems,
      containerData,
      profile.fountainBlockSize,
      profile.id,
      profile.paletteMode as PaletteMode,
      isEncrypted,
      cryptoMeta
    );
    manifestChunksRef.current = ManifestSerializer.fragment(
      ManifestSerializer.encode(manifest),
      profile.fountainBlockSize
    );
    manifestChunkIndexRef.current = 0;

    const encoder = new LTEncoder(containerData, profile.fountainBlockSize);
    encoderRef.current = encoder;
    setTotalK(encoder.getK());
    setSymbolId(0);
    frameSeqRef.current = 0;

    startTimeRef.current = performance.now();
    lastTimeRef.current = performance.now();
    setIsTransmitting(true);
    setIsPaused(false);
  };

  useEffect(() => {
    if (!isTransmitting || isPaused) return;

    const intervalMs = 1000 / profile.targetFPS;

    const loop = (timestamp: number) => {
      const delta = timestamp - lastTimeRef.current;
      if (delta >= intervalMs) {
        lastTimeRef.current = timestamp;

        frameSeqRef.current++;
        const currentSeq = frameSeqRef.current;

        const manifestEveryFrames = Math.max(1, Math.round(profile.manifestIntervalMs / intervalMs));
        const isManifestFrame = manifestChunksRef.current.length > 0
          && (currentSeq <= manifestChunksRef.current.length || currentSeq % manifestEveryFrames === 1);

        let frameTypeVal: number = FrameType.DATA;
        let payload: Uint8Array;
        let tileSymbolId = symbolId;

        if (isManifestFrame) {
          frameTypeVal = FrameType.MANIFEST;
          tileSymbolId = manifestChunkIndexRef.current % manifestChunksRef.current.length;
          payload = manifestChunksRef.current[tileSymbolId];
          manifestChunkIndexRef.current++;
        } else if (encoderRef.current) {
          const currentSymId = symbolId;
          const sym = encoderRef.current.generateSymbol(currentSymId);
          payload = sym.data;
          tileSymbolId = currentSymId;
          setSymbolId((prev) => prev + 1);
        } else {
          payload = new Uint8Array(profile.fountainBlockSize);
        }

        const header = FrameBuilder.packHeader(
          frameTypeVal as any,
          currentSeq,
          profile.tilesCount,
          profile.paletteMode as PaletteMode
        );

        const tile = TilePacker.packTile(
          0,
          currentSeq,
          tileSymbolId,
          payload,
          profile.rsEccBytes
        );

        setHeaderData(header);
        setTilesData([tile]);

        const now = performance.now();
        const elapsed = (now - startTimeRef.current) / 1000;
        setElapsedSec(Math.round(elapsed));

        const fps = Math.round(1000 / Math.max(1, delta));
        setCurrentFPS(fps);

        const bytesEmitted = symbolId * profile.fountainBlockSize;
        const bps = Math.round(bytesEmitted / Math.max(1, elapsed));
        setAvgSpeedBps(bps);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isTransmitting, isPaused, profile, symbolId]);

  const redundancyPercent = totalK > 0 ? Math.round((symbolId / totalK) * 100) : 0;

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
            selectedProfile={selectedProfile}
            onProfileChange={setSelectedProfile}
            isEncrypted={isEncrypted}
            onEncryptionToggle={setIsEncrypted}
            password={password}
            onPasswordChange={setPassword}
            onStart={startTransmission}
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-neutral-900/90 rounded-3xl border border-neutral-800 p-6 flex flex-col items-center gap-6 shadow-2xl">
            <OpticalMatrixCanvas
              rows={profile.gridRows}
              cols={profile.gridCols}
              paletteMode={profile.paletteMode as PaletteMode}
              headerData={headerData}
              tilesData={tilesData}
              isFullscreen={isFullscreen}
            />

            <div className="bg-neutral-950/80 border border-neutral-800 p-3 rounded-xl text-xs text-neutral-400 max-w-md text-center">
              <ShieldAlert className="w-4 h-4 text-emerald-400 inline mr-1.5" />
              {t.redundancyHelp}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={isPaused ? 'Resume transmission' : 'Pause transmission'}
                onClick={() => setIsPaused(!isPaused)}
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
                onClick={() => setIsTransmitting(false)}
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
              subtext={`${symbolId} / ${totalK} symbols`}
              accent="emerald"
            />
            <MetricCard
              label="Display FPS"
              value={currentFPS}
              subtext={`Target ${profile.targetFPS} FPS`}
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
