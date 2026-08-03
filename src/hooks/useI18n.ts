import { useState, useEffect } from 'react';

export type Language = 'ru' | 'en';

export const translations = {
  ru: {
    appTitle: 'LumenLink',
    tagline: 'Оптическая браузерная система передачи файлов без сети',
    sendFile: 'Передать файл',
    receiveFile: 'Принять файл',
    calibrate: 'Калибровка',
    history: 'История сессий',
    settings: 'Настройки',
    about: 'О протоколе',
    diagnostics: 'Диагностика',
    benchmark: 'Бенчмарк',
    pwaInstall: 'Установить PWA',
    opticalOnlyNotice: 'Данные передаются строго через световые импульсы экрана на камеру. Никаких Wi-Fi, Bluetooth или серверов.',
    selectFiles: 'Выберите файлы для отправки',
    dropFilesHere: 'Перетащите файлы сюда или нажмите для выбора',
    totalFiles: 'Файлов',
    totalSize: 'Общий размер',
    estimatedTime: 'Расчётное время',
    profile: 'Профиль скорости',
    encryption: 'Шифрование AES-256-GCM',
    enterPassword: 'Введите пароль для шифрования',
    startTransmission: 'Начать передачу',
    stopTransmission: 'Остановить',
    pauseTransmission: 'Пауза',
    fullscreen: 'Полноэкранный режим',
    brightness: 'Яркость экрана',
    generatedRedundancy: 'Сгенерировано избыточности',
    redundancyHelp: '100% — передан минимальный объём. >100% — избыточные fountain-символы для гарантированного восстановления при потере кадров.',
    currentSpeed: 'Текущая скорость',
    avgSpeed: 'Средняя скорость',
    cameraAccess: 'Разрешить доступ к камере',
    lookingForScreen: 'Поиск оптической матрицы...',
    signalQuality: 'Качество сигнала',
    cameraFPS: 'FPS камеры',
    framesRead: 'Считано кадров',
    framesCorrupted: 'Повреждено кадров',
    fountainBlocks: 'Восстановлено блоков',
    reconstructionProgress: 'Прогресс восстановления',
    fileRestored: 'Файл успешно восстановлен!',
    viewFile: 'Открыть',
    downloadFile: 'Скачать файл',
    verifyHash: 'SHA-256 проверен',
    tips: {
      bringCloser: 'Приблизьте камеру к экрану',
      reduceAngle: 'Уменьшите угол наклона',
      increaseBrightness: 'Увеличьте яркость экрана',
      holdSteady: 'Удерживайте устройство неподвижно',
      disableReflections: 'Устраните блики и отражения',
      cellTooSmall: 'Матрица слишком мелкая, выберите профиль Reliable',
      cameraLagging: 'Камера не успевает за частотой экрана',
      blurDetected: 'Обнаружено размытие изображения',
    },
  },
  en: {
    appTitle: 'LumenLink',
    tagline: 'Serverless Optical Screen-to-Camera File Transport',
    sendFile: 'Send File',
    receiveFile: 'Receive File',
    calibrate: 'Calibrate',
    history: 'Session History',
    settings: 'Settings',
    about: 'About Protocol',
    diagnostics: 'Diagnostics',
    benchmark: 'Benchmark',
    pwaInstall: 'Install PWA',
    opticalOnlyNotice: 'Data is transmitted purely via screen light pulses to the camera. Zero Wi-Fi, Bluetooth, or server communication.',
    selectFiles: 'Select files to send',
    dropFilesHere: 'Drop files here or click to browse',
    totalFiles: 'Files',
    totalSize: 'Total Size',
    estimatedTime: 'Estimated Time',
    profile: 'Speed Profile',
    encryption: 'AES-256-GCM Encryption',
    enterPassword: 'Enter encryption password',
    startTransmission: 'Start Transmission',
    stopTransmission: 'Stop',
    pauseTransmission: 'Pause',
    fullscreen: 'Fullscreen Mode',
    brightness: 'Display Brightness',
    generatedRedundancy: 'Generated Redundancy',
    redundancyHelp: '100% = baseline payload sent. >100% = extra fountain symbols emitted to guarantee recovery under frame loss.',
    currentSpeed: 'Current Speed',
    avgSpeed: 'Average Speed',
    cameraAccess: 'Allow Camera Access',
    lookingForScreen: 'Searching for optical matrix...',
    signalQuality: 'Signal Quality',
    cameraFPS: 'Camera FPS',
    framesRead: 'Frames Read',
    framesCorrupted: 'Frames Corrupted',
    fountainBlocks: 'Blocks Recovered',
    reconstructionProgress: 'Reconstruction Progress',
    fileRestored: 'File successfully restored!',
    viewFile: 'Open',
    downloadFile: 'Download File',
    verifyHash: 'SHA-256 Verified',
    tips: {
      bringCloser: 'Bring camera closer to the screen',
      reduceAngle: 'Reduce camera tilt angle',
      increaseBrightness: 'Increase screen brightness',
      holdSteady: 'Hold device steady',
      disableReflections: 'Eliminate screen glare and reflections',
      cellTooSmall: 'Matrix cells too small, select Reliable profile',
      cameraLagging: 'Camera FPS lagging behind display frequency',
      blurDetected: 'Motion blur detected',
    },
  },
};

export function useI18n() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('lumenlink_lang');
    return (saved === 'en' || saved === 'ru') ? saved : 'ru';
  });

  const toggleLanguage = () => {
    const next = lang === 'ru' ? 'en' : 'ru';
    setLang(next);
    localStorage.setItem('lumenlink_lang', next);
  };

  return {
    lang,
    toggleLanguage,
    t: translations[lang],
  };
}
