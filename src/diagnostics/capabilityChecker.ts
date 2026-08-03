export interface BrowserCapabilities {
  webWorkers: boolean;
  offscreenCanvas: boolean;
  webCrypto: boolean;
  mediaDevices: boolean;
  requestVideoFrameCallback: boolean;
  webGL2: boolean;
  indexedDB: boolean;
  serviceWorker: boolean;
  estimatedStorageMB: number;
}

export class CapabilityChecker {
  public static async check(): Promise<BrowserCapabilities> {
    const webWorkers = typeof Worker !== 'undefined';
    const offscreenCanvas = typeof OffscreenCanvas !== 'undefined';
    const webCrypto = typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';
    const mediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const requestVideoFrameCallback = 'requestVideoFrameCallback' in HTMLVideoElement.prototype;
    const indexedDB = typeof window.indexedDB !== 'undefined';
    const serviceWorker = 'serviceWorker' in navigator;

    let webGL2 = false;
    try {
      const canvas = document.createElement('canvas');
      webGL2 = !!canvas.getContext('webgl2');
    } catch {
      webGL2 = false;
    }

    let estimatedStorageMB = 500;
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        if (est.quota) {
          estimatedStorageMB = Math.round(est.quota / (1024 * 1024));
        }
      } catch {
        // Fallback
      }
    }

    return {
      webWorkers,
      offscreenCanvas,
      webCrypto,
      mediaDevices,
      requestVideoFrameCallback,
      webGL2,
      indexedDB,
      serviceWorker,
      estimatedStorageMB,
    };
  }
}
