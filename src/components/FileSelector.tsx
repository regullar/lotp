import React, { useRef, useState } from 'react';
import { Upload, FileText, Trash2, Lock } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';
import { DEFAULT_RAPTOR_SETTINGS, getRaptorCapacity, type RaptorSettings } from '../protocol/raptorTransport';

interface FileSelectorProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  isEncrypted: boolean;
  onEncryptionToggle: (encrypted: boolean) => void;
  password: string;
  onPasswordChange: (pw: string) => void;
  onStart: (settings: RaptorSettings) => void;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const FileSelector: React.FC<FileSelectorProps> = ({
  files,
  onFilesSelected,
  onRemoveFile,
  isEncrypted,
  onEncryptionToggle,
  password,
  onPasswordChange,
  onStart,
}) => {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [settings, setSettings] = useState(DEFAULT_RAPTOR_SETTINGS);

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  const estSpeedBps = settings.fps * settings.parallel * getRaptorCapacity(settings.version).sourceBytes * 0.75;
  const estSeconds = Math.max(2, Math.ceil(totalSize / estSpeedBps));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  return (
    <div className="space-y-6">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFilesSelected(Array.from(e.target.files));
        }}
      />
      <button
        type="button"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-neutral-700 hover:border-cyan-500 bg-neutral-950 rounded-2xl p-8 text-center cursor-pointer transition-colors group"
      >
        <div className="w-12 h-12 rounded-xl border border-neutral-800 bg-neutral-900 flex items-center justify-center text-cyan-400 mx-auto mb-3 group-hover:scale-110 transition-transform">
          <Upload className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-white text-base mb-1">{t.selectFiles}</h3>
        <p className="text-xs text-neutral-400">{t.dropFilesHere}</p>
      </button>

      {files.length > 0 && (
        <div className="bg-neutral-900/80 rounded-xl border border-neutral-800 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>{t.totalFiles}: {files.length}</span>
            <span>{t.totalSize}: {formatSize(totalSize)}</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {files.map((file, idx) => (
              <div
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-neutral-200 font-medium truncate">{file.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-400 font-mono">{formatSize(file.size)}</span>
                  <button
                    type="button"
                    aria-label={`Удалить ${file.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(idx);
                    }}
                    className="text-neutral-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <details className="advanced-settings">
        <summary>
          <span>
            <b>{t.advancedSettings}</b>
            <small>{t.advancedSettingsSummary}</small>
          </span>
          <span className="advanced-summary-value">
            {settings.parallel} QR · v{settings.version} · {settings.fps} FPS
          </span>
        </summary>
        <div className="advanced-settings-body">
          <label className="block text-xs text-neutral-300">
            <span className="flex justify-between"><span>Плотность QR</span><b>v{settings.version}</b></span>
            <input
              type="range"
              min={10}
              max={30}
              step={5}
              value={settings.version}
              onChange={(event) => setSettings({ ...settings, version: Number(event.target.value) })}
              className="mt-2 w-full accent-emerald-500"
            />
            <span className="mt-1 flex justify-between text-xs text-neutral-300"><span>проще считать</span><span>больше данных</span></span>
          </label>

          <label className="block text-xs text-neutral-300">
            <span className="flex justify-between"><span>Скорость кадров</span><b>{settings.fps} FPS</b></span>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={settings.fps}
              onChange={(event) => setSettings({ ...settings, fps: Number(event.target.value) })}
              className="mt-2 w-full accent-cyan-500"
            />
            <span className="mt-1 flex justify-between text-xs text-neutral-300"><span>стабильнее</span><span>быстрее</span></span>
          </label>

          <label className="block text-xs text-neutral-300">
            <span className="flex justify-between"><span>QR одновременно</span><b>{settings.parallel}</b></span>
            <input
              type="range"
              min={1}
              max={4}
              step={3}
              value={settings.parallel}
              onChange={(event) => setSettings({ ...settings, parallel: Number(event.target.value) as 1 | 4 })}
              className="mt-2 w-full accent-amber-500"
            />
            <span className="mt-1 flex justify-between text-xs text-neutral-300"><span>1 — надёжно</span><span>4 — быстро</span></span>
          </label>
        </div>
      </details>

      <div className="send-encryption space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-neutral-200">
            <Lock className="w-4 h-4 text-amber-400" />
            {t.encryption}
          </div>
          <input
            type="checkbox"
            aria-label={t.encryption}
            checked={isEncrypted}
            onChange={(e) => onEncryptionToggle(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-700 text-cyan-500 focus:ring-cyan-500 bg-neutral-950"
          />
        </div>

        {isEncrypted && (
          <input
            type="password"
            placeholder={t.enterPassword}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-4 pt-2">
        <div className="text-xs text-neutral-400 font-mono">
          {t.estimatedTime}: ~{estSeconds}s
        </div>
        <button
          type="button"
          disabled={files.length === 0 || (isEncrypted && !password)}
          onClick={() => onStart(settings)}
          className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-bold text-sm tracking-wide transition-colors"
        >
          {t.startTransmission}
        </button>
      </div>
    </div>
  );
};
