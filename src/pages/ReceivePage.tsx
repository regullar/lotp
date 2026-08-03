import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { CameraViewfinder } from '../components/CameraViewfinder';
import { SignalQualityBadge, SignalLevel } from '../components/SignalQualityBadge';
import { MetricCard } from '../components/MetricCard';
import { useCamera } from '../hooks/useCamera';
import { PROFILES } from '../protocol/constants';
import { ManifestSerializer } from '../protocol/manifest';
import { LTDecoder } from '../protocol/fountain/fountain';
import {
  fnv1a,
  parseTransportFrame,
  transportIdentity,
  type TransportHeader,
} from '../protocol/transportFrame';
import { LOTPContainer, ContainerFile } from '../protocol/container/lotpContainer';
import { LOTPCrypto } from '../protocol/crypto/aesgcm';
import { useI18n } from '../hooks/useI18n';
import { Camera, CheckCircle2, Download, Eye, AlertTriangle, ArrowLeft } from 'lucide-react';

interface ReceivePageProps {
  setActiveTab: (tab: string) => void;
}

const canPreview = (mimeType: string) => /^(image|audio|video|text)\//.test(mimeType) || mimeType === 'application/pdf';

const RestoredFileActions: React.FC<{
  file: ContainerFile;
  openLabel: string;
  downloadLabel: string;
}> = ({ file, openLabel, downloadLabel }) => {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const nextUrl = URL.createObjectURL(new Blob([file.data.slice().buffer as ArrayBuffer], { type: file.mimeType }));
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [file]);

  if (!url) return null;

  return (
    <div className="flex items-center gap-2">
      {canPreview(file.mimeType) && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
        >
          <Eye className="w-4 h-4" />
          {openLabel}
        </a>
      )}
      <a
        href={url}
        download={file.name}
        className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center gap-1.5 transition-colors"
      >
        <Download className="w-4 h-4" />
        {downloadLabel}
      </a>
    </div>
  );
};

export const ReceivePage: React.FC<ReceivePageProps> = ({ setActiveTab }) => {
  const { t } = useI18n();
  const { stream, error, videoRef, startCamera, stopCamera } = useCamera();

  const [profileName, setProfileName] = useState<string>('Автоматически');

  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [detected, setDetected] = useState<boolean>(false);
  const [signalLevel, setSignalLevel] = useState<SignalLevel>('searching');

  // Session state
  const [decoder, setDecoder] = useState<LTDecoder | null>(null);
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

  const decoderRef = useRef<LTDecoder | null>(null);
  const transportHeaderRef = useRef<TransportHeader | null>(null);
  const streamKeyRef = useRef<string>('');
  const completedRef = useRef<boolean>(false);
  const lastDecodeTimeRef = useRef<number>(0);
  const finishingRef = useRef<boolean>(false);
  const finishReconstructionRef = useRef<() => Promise<void>>(async () => {});
  const qrHandlerRef = useRef<(bytes: Uint8Array) => void>(() => {});

  const finishReconstruction = async () => {
    const currentDecoder = decoderRef.current;
    const currentHeader = transportHeaderRef.current;
    if (!currentDecoder || !currentHeader || finishingRef.current) return;
    const transportPayload = currentDecoder.reconstruct();
    if (!transportPayload) return;
    if (fnv1a(transportPayload) !== currentHeader.payloadHash) {
      setRecoveryError('Контрольная сумма QR-потока не совпала. Перезапустите передачу.');
      return;
    }

    const currentManifest = ManifestSerializer.decode(transportPayload);
    if (!currentManifest) {
      setRecoveryError('Манифест восстановленного потока повреждён.');
      return;
    }
    const manifestSize = currentManifest.isEncrypted ? 40 : 16;
    if (transportPayload.length !== manifestSize + currentManifest.totalSize) {
      setRecoveryError('Размер восстановленных данных не совпал.');
      return;
    }
    const rawContainer = transportPayload.subarray(manifestSize);

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
      setRecoveryError('Не удалось восстановить исходный файл. Запустите сканирование заново.');
      finishingRef.current = false;
    }
  };
  useEffect(() => {
    finishReconstructionRef.current = finishReconstruction;
  });

  const handleQRCode = (bytes: Uint8Array) => {
    const parsed = parseTransportFrame(bytes);
    if (!parsed) {
      setFramesCorrupted((prev) => prev + 1);
      return;
    }
    const { header, block } = parsed;
    const matchedProfile = Object.values(PROFILES).find((candidate) =>
      candidate.fountainBlockSize === header.blockSize
    );
    const identity = transportIdentity(header);
    if (!decoderRef.current || streamKeyRef.current !== identity) {
      const nextDecoder = new LTDecoder(
        header.blockCount,
        header.blockSize,
        header.sessionId,
        header.totalSize,
      );
      decoderRef.current = nextDecoder;
      transportHeaderRef.current = header;
      streamKeyRef.current = identity;
      completedRef.current = false;
      finishingRef.current = false;
      setDecoder(nextDecoder);
      setFramesRead(0);
      setRecoveryProgress(0);
      setRecoveryError(null);
      setRequiresPassword(false);
    }

    const currentDecoder = decoderRef.current;
    const framesBefore = currentDecoder.framesNew;
    currentDecoder.addFrame(header.sequence, block);
    if (currentDecoder.framesNew === framesBefore) return;

    const now = performance.now();
    if (lastDecodeTimeRef.current) {
      setCameraFPS(Math.round(1000 / Math.max(1, now - lastDecodeTimeRef.current)));
    }
    lastDecodeTimeRef.current = now;
    setProfileName(matchedProfile?.name ?? `${header.blockSize} B/frame`);
    setDetected(true);
    setSignalLevel('excellent');
    setFramesRead(currentDecoder.framesNew);
    const arrivalProgress = currentDecoder.framesNew / Math.max(1, currentDecoder.blockCount * 1.5);
    const solvedProgress = currentDecoder.solvedCount / currentDecoder.blockCount;
    setRecoveryProgress(currentDecoder.isComplete ? 100 : Math.min(99, Math.round(Math.max(arrivalProgress, solvedProgress) * 100)));

    if (currentDecoder.isComplete && !completedRef.current) {
      completedRef.current = true;
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

    decoderRef.current = null;
    transportHeaderRef.current = null;
    streamKeyRef.current = '';
    completedRef.current = false;
    lastDecodeTimeRef.current = 0;
    setDecoder(null);
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

    const workerCount = Math.min(2, Math.max(1, navigator.hardwareConcurrency || 2));
    const workers = Array.from({ length: workerCount }, () =>
      new Worker(new URL('../workers/qrDecodeWorker.ts', import.meta.url), { type: 'module' })
    );
    const busy = workers.map(() => false);
    let active = true;
    const canvas = document.createElement('canvas');
    let frameId = 0;
    const noSignalTimer = window.setTimeout(() => {
      if (active && !decoderRef.current) {
        setRecoveryError('Ни один QR-кадр не считан. Включите Reliable QR, поднесите камеру ближе и увеличьте яркость экрана.');
      }
    }, 10_000);

    workers.forEach((worker, slot) => {
      worker.onmessage = (event: MessageEvent) => {
        const { id, bytes } = event.data as { id: number; bytes: Uint8Array | null };
        if (id === -1) return;
        busy[slot] = false;
        if (bytes) qrHandlerRef.current(bytes);
      };
    });

    const capture = () => {
      const slot = busy.indexOf(false);
      if (slot === -1 || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return;
      const side = Math.floor(Math.min(video.videoWidth, video.videoHeight) * 0.8);
      if (canvas.width !== side || canvas.height !== side) {
        canvas.width = side;
        canvas.height = side;
      }
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) return;
      const sourceX = (video.videoWidth - side) / 2;
      const sourceY = (video.videoHeight - side) / 2;
      context.drawImage(video, sourceX, sourceY, side, side, 0, 0, side, side);
      const image = context.getImageData(0, 0, side, side);
      busy[slot] = true;
      workers[slot].postMessage(
        { id: frameId++, buffer: image.data.buffer, width: canvas.width, height: canvas.height },
        [image.data.buffer],
      );
    };

    const schedule = () => {
      if (!active) return;
      const next = () => {
        if (!active) return;
        capture();
        schedule();
      };
      if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(next);
      else requestAnimationFrame(next);
    };
    schedule();

    return () => {
      active = false;
      window.clearTimeout(noSignalTimer);
      workers.forEach((worker) => worker.terminate());
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
                <RestoredFileActions file={file} openLabel={t.viewFile} downloadLabel={t.downloadFile} />
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
              {decoder?.isComplete && (
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
            <MetricCard label={t.fountainBlocks} value={`${decoder?.solvedCount || 0}/${decoder?.blockCount || 0}`} accent="emerald" />
          </div>
        </div>
      )}
    </div>
  );
};
