import React, { useRef } from 'react';
import { Upload, FileText, Trash2, Lock } from 'lucide-react';
import { PROFILES } from '../protocol/constants';
import { useI18n } from '../hooks/useI18n';

interface FileSelectorProps {
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  selectedProfile: string;
  onProfileChange: (profileId: string) => void;
  isEncrypted: boolean;
  onEncryptionToggle: (encrypted: boolean) => void;
  password: string;
  onPasswordChange: (pw: string) => void;
  onStart: () => void;
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
  selectedProfile,
  onProfileChange,
  isEncrypted,
  onEncryptionToggle,
  password,
  onPasswordChange,
  onStart,
}) => {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const totalSize = files.reduce((acc, f) => acc + f.size, 0);

  const currentProfile = PROFILES[selectedProfile] || PROFILES.reliable;
  const estSpeedBps = currentProfile.targetFPS * currentProfile.fountainBlockSize * 0.8;
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
        className="w-full border-2 border-dashed border-neutral-700 hover:border-emerald-500/60 bg-neutral-900/40 hover:bg-neutral-900/80 rounded-2xl p-8 text-center cursor-pointer transition-colors group"
      >
        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto mb-3 group-hover:scale-110 transition-transform">
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
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
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

      <div className="space-y-2">
        <div className="text-xs font-mono text-neutral-400 font-medium">{t.profile}</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.values(PROFILES).map((prof) => {
            const isSelected = selectedProfile === prof.id;
            return (
              <button
                type="button"
                key={prof.id}
                onClick={() => onProfileChange(prof.id)}
                className={`p-3 rounded-xl border cursor-pointer text-left transition-colors ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-md'
                    : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="font-bold text-sm text-white mb-1">{prof.name}</div>
                <div className="text-xs text-neutral-400">{prof.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/60 space-y-3">
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
            className="w-4 h-4 rounded border-neutral-700 text-emerald-500 focus:ring-emerald-500 bg-neutral-950"
          />
        </div>

        {isEncrypted && (
          <input
            type="password"
            placeholder={t.enterPassword}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-lg px-3 py-2 text-xs text-white outline-none font-mono"
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
          onClick={onStart}
          className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold text-sm tracking-wide shadow-lg shadow-emerald-500/20 transition-colors"
        >
          {t.startTransmission}
        </button>
      </div>
    </div>
  );
};
