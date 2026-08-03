import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { CameraViewfinder } from '../components/CameraViewfinder';
import { SignalQualityBadge, SignalLevel } from '../components/SignalQualityBadge';
import { MetricCard } from '../components/MetricCard';
import { useCamera } from '../hooks/useCamera';
import { PROFILES, FrameType } from '../protocol/constants';
import { BrowserQRCodeReader, type IScannerControls } from '@zxing/browser';
import { ManifestSerializer, SessionManifest } from '../protocol/manifest';
import { LTPeelingDecoder } from '../protocol/fountain/peeling';
import { LTEncoder } from '../protocol/fountain/ltcode';
import { FrameBuilder } from '../protocol/frame';
import { TilePacker } from '../protocol/tile';
import { decodeQRFrame } from '../protocol/qrFrame';
import { LOTPContainer, ContainerFile } from '../protocol/container/lotpContainer';
import { LOTPCrypto } from '../protocol/crypto/aesgcm';
import { useI18n } from '../hooks/useI18n';
import { Camera, CheckCircle2, Download, AlertTriangle, ArrowLeft } from 'lucide-react';

interface ReceivePageProps {
  setActiveTab: (tab: string) => void;
}

const downloadFile = (file: ContainerFile) => {
  const url = URL.createObjectURL(new Blob([file.data.slice().buffer as ArrayBuffer], { type: file.mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
};

export const ReceivePage: React.FC<ReceivePageProps> = ({ setActiveTab }) => {
  const { t } = useI18n();
  const { stream, error, videoRef, startCamera, stopCamera } = useCamera();

  const [profileName, setProfileName] = useState<string>('Автоматически');

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [detected, setDetected] = useState<boolean>(false);
  const [signalLevel, setSignalLevel] = useState<SignalLevel>('searching');

  // Session state
  const [decoder, setDecoder] = useState<LTPeelingDecoder | null>(null);
  const [decryptedPassword, setDecryptedPassword] = useState<string>('');
  const [requiresPassword, setRequiresPassword] = useState<boolean>(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);

  // Stats
  const [framesRead, setFramesRead] = useState<number>(0);
  const [framesCorrupted, setFramesCorrupted] = useState<number>(0);
  const [cameraFPS, setCameraFPS] = useState<number>(0);
  const [recoveryProgress, setRecoveryProgress] = useState<number>(0);

  // Completed Files
  const [restoredFiles, setRestoredFiles] = useState<ContainerFile[]>([]);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const decoderRef = useRef<LTPeelingDecoder | null>(null);
  const manifestRef = useRef<SessionManifest | null>(null);
  const completedRef = useRef<boolean>(false);
  const lastFrameSeqRef = useRef<number | null>(null);
  const lastDecodeTimeRef = useRef<number>(0);
  const finishingRef = useRef<boolean>(false);
  const manifestFragmentsRef = useRef<{ id: number; fragments: Map<number, Uint8Array> } | null>(null);
  const finishReconstructionRef = useRef<() => Promise<void>>(async () => {});
  const qrHandlerRef = useRef<(text: string) => void>(() => {});

  const finishReconstruction = async () => {
    const currentDecoder = decoderRef.current;
    const currentManifest = manifestRef.current;
    if (!currentDecoder || !currentManifest || finishingRef.current) return;
    const rawContainer = currentDecoder.reconstruct();
    if (!rawContainer) return;

    let payloadBytes = rawContainer;

    if (currentManifest.isEncrypted) {
      if (!decryptedPassword) {
        setRequiresPassword(true);
        return;
      }

      finishingRef.current = true;

      try {
        const { saltHex, noncePrefixHex } = currentManifest;
        if (!saltHex || !noncePrefixHex) throw new Error('Missing crypto metadata.');
        const salt = Uint8Array.from({ length: 16 }, (_, index) => parseInt(saltHex.slice(index * 2, index * 2 + 2), 16));
        const noncePrefix = Uint8Array.from({ length: 8 }, (_, index) => parseInt(noncePrefixHex.slice(index * 2, index * 2 + 2), 16));
        payloadBytes = await LOTPCrypto.decrypt({ salt, noncePrefix, ciphertext: rawContainer }, decryptedPassword);
      } catch {
        setRecoveryError('Неверный пароль или повреждённые зашифрованные данные.');
        finishingRef.current = false;
        return;
      }
    } else {
      finishingRef.current = true;
    }

    try {
      const files = await LOTPContainer.unpack(payloadBytes);
      if (!files.length) throw new Error('Empty container.');
      const hashes = await Promise.all(files.map((file) => LOTPContainer.calcSHA256(file.data)));
      if (files.some((file, index) => file.sha256 !== hashes[index])) {
        throw new Error('File checksum mismatch.');
      }
      setRestoredFiles(files);
      completedRef.current = true;
      setIsCompleted(true);
      setIsScanning(false);
      setRecoveryError(null);
      stopCamera();

      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch {
      setRecoveryError('Не удалось распаковать восстановленные данные. Запустите сканирование заново.');
      finishingRef.current = false;
    }
  };
  useEffect(() => {
    finishReconstructionRef.current = finishReconstruction;
  });

  const handleQRCode = (text: string) => {
    const frameBytes = decodeQRFrame(text);
    const matchedProfile = frameBytes && Object.values(PROFILES).find((candidate) =>
      frameBytes.length === 11 + 14 + candidate.fountainBlockSize + candidate.rsEccBytes
    );
    if (!frameBytes || !matchedProfile) {
      setFramesCorrupted((prev) => prev + 1);
      return;
    }

    const header = FrameBuilder.unpackHeader(frameBytes.subarray(0, 11));
    const tile = TilePacker.unpackTile(
      frameBytes.subarray(11),
      matchedProfile.rsEccBytes,
      matchedProfile.fountainBlockSize
    );
    if (!header || !tile || header.frameSeq !== tile.frameSeq || header.paletteMode !== matchedProfile.paletteMode) {
      setFramesCorrupted((prev) => prev + 1);
      return;
    }
    if (lastFrameSeqRef.current === header.frameSeq) return;
    lastFrameSeqRef.current = header.frameSeq;

    const now = performance.now();
    if (lastDecodeTimeRef.current) {
      setCameraFPS(Math.round(1000 / Math.max(1, now - lastDecodeTimeRef.current)));
    }
    lastDecodeTimeRef.current = now;
    setProfileName(matchedProfile.name);
    setDetected(true);
    setSignalLevel('excellent');
    setFramesRead((prev) => prev + 1);

    if (header.frameType === FrameType.MANIFEST && !manifestRef.current) {
      const fragmentView = new DataView(tile.payload.buffer, tile.payload.byteOffset, tile.payload.byteLength);
      const fragmentId = fragmentView.getUint16(0, false);
      if (manifestFragmentsRef.current?.id !== fragmentId) {
        manifestFragmentsRef.current = { id: fragmentId, fragments: new Map() };
      }
      manifestFragmentsRef.current.fragments.set(tile.payload[3], new Uint8Array(tile.payload));

      const manifestBytes = ManifestSerializer.assemble(Array.from(manifestFragmentsRef.current.fragments.values()));
      const parsedManifest = manifestBytes ? ManifestSerializer.decode(manifestBytes) : null;
      if (parsedManifest) {
        if (parsedManifest.blockSize !== matchedProfile.fountainBlockSize) {
          setRecoveryError('Некорректный профиль в манифесте.');
          return;
        }
        const peeler = new LTPeelingDecoder(
          parsedManifest.totalBlocks,
          parsedManifest.blockSize,
          parsedManifest.totalSize
        );
        manifestRef.current = parsedManifest;
        decoderRef.current = peeler;
        setDecoder(peeler);
        setRequiresPassword(parsedManifest.isEncrypted);
      }
      return;
    }

    const currentDecoder = decoderRef.current;
    if (header.frameType !== FrameType.DATA || !currentDecoder) return;

    const wasComplete = currentDecoder.isComplete();
    const finished = currentDecoder.addSymbol({
      ...LTEncoder.getSymbolMetadata(tile.symbolId, currentDecoder.getTotalBlocks()),
      data: tile.payload,
    });
    setRecoveryProgress(Math.round(currentDecoder.getProgress() * 100));

    if (finished && !wasComplete && !completedRef.current) {
      setIsScanning(false);
      void finishReconstructionRef.current();
    }
  };
  useEffect(() => {
    qrHandlerRef.current = handleQRCode;
  });

  const handleStartScanning = async () => {
    const started = await startCamera();
    if (!started) return;

    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    decoderRef.current = null;
    manifestRef.current = null;
    completedRef.current = false;
    lastFrameSeqRef.current = null;
    lastDecodeTimeRef.current = 0;
    setDecoder(null);
    manifestFragmentsRef.current = null;
    finishingRef.current = false;
    setProfileName('Автоматически');
    setDetected(false);
    setSignalLevel('searching');
    setIsScanning(true);
    setIsCompleted(false);
    setFramesRead(0);
    setFramesCorrupted(0);
    setRecoveryProgress(0);
    setRecoveryError(null);
    setRequiresPassword(false);
    setDecryptedPassword('');
    setRestoredFiles([]);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!isScanning || !stream || !video) return;

    let active = true;
    const reader = new BrowserQRCodeReader(undefined, {
      delayBetweenScanAttempts: 50,
      delayBetweenScanSuccess: 80,
    });
    void reader.decodeFromStream(stream, video, (result) => {
      if (result) qrHandlerRef.current(result.getText());
    }).then((controls) => {
      if (active) scannerControlsRef.current = controls;
      else controls.stop();
    }).catch((scanError) => {
      if (active) {
        setRecoveryError(scanError instanceof Error ? scanError.message : 'Не удалось запустить QR-сканер.');
      }
    });

    return () => {
      active = false;
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;
    };
  }, [isScanning, stream, videoRef]);

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
      <button
        type="button"
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
            <p className="text-xs text-neutral-400 max-w-md mx-auto mb-4">
              Разрешите доступ к камере и наведите её на QR-код на экране отправителя.
            </p>
            <div className="text-xs font-mono text-emerald-400 mb-4">QR-профиль определится автоматически</div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 max-w-md mx-auto text-left">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>{error}</div>
            </div>
          )}

          <button
            type="button"
            onClick={handleStartScanning}
            className="px-8 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-sm tracking-wide shadow-lg shadow-cyan-500/20 transition-colors"
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
            {restoredFiles.map((file) => (
              <div key={`${file.name}-${file.lastModified}-${file.sha256}`} className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
                <div className="text-left truncate">
                  <div className="font-semibold text-sm text-white truncate">{file.name}</div>
                  <div className="text-xs text-neutral-400 font-mono">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
                <button
                  type="button"
                  onClick={() => downloadFile(file)}
                  className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t.downloadFile}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SignalQualityBadge level={signalLevel} confidence={detected ? 1 : undefined} />
              <span className="text-xs font-mono text-neutral-400">QR · {profileName}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                scannerControlsRef.current?.stop();
                stopCamera();
                setIsScanning(false);
              }}
              className="text-xs font-mono text-neutral-400 hover:text-rose-400 transition-colors"
            >
              Stop Camera
            </button>
          </div>

          <CameraViewfinder videoRef={videoRef} detected={detected} />

          {requiresPassword && (
            <div className="bg-neutral-900/80 rounded-2xl border border-neutral-800 p-4 flex flex-col sm:flex-row gap-3">
              <label htmlFor="recovery-password" className="sr-only">Пароль шифрования</label>
              <input
                id="recovery-password"
                type="password"
                value={decryptedPassword}
                onChange={(event) => setDecryptedPassword(event.target.value)}
                placeholder="Пароль шифрования"
                className="flex-1 rounded-xl bg-neutral-950 border border-neutral-700 px-4 py-3 text-sm text-white outline-none focus:border-cyan-500"
              />
              {decoder?.isComplete() && (
                <button
                  type="button"
                  onClick={finishReconstruction}
                  disabled={!decryptedPassword}
                  className="px-5 py-3 rounded-xl bg-cyan-500 disabled:opacity-40 text-black font-bold text-sm"
                >
                  Восстановить
                </button>
              )}
            </div>
          )}

          {recoveryError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>{recoveryError}</div>
            </div>
          )}

          <div className="bg-neutral-900/80 rounded-2xl border border-neutral-800 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400">{t.reconstructionProgress}</span>
              <span className="text-emerald-400 font-bold">{recoveryProgress}%</span>
            </div>
            <div className="w-full h-3 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-[width] duration-300"
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
