import { decodeQRCodesFromCanvas } from '@raptorqr/core/qr/qr_decode';

self.onmessage = async (event: MessageEvent) => {
  const { id, buffer, width, height } = event.data as {
    id: number;
    buffer: ArrayBuffer;
    width: number;
    height: number;
  };
  try {
    const image = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const results = await decodeQRCodesFromCanvas(image, {
      maxSymbols: 4,
      binarizer: 'LocalAverage',
      tryHarder: false,
      tryRotate: false,
      tryInvert: false,
      tryDownscale: true,
      downscaleFactor: 3,
    });
    const frames = results.map((result) => result.bytes);
    self.postMessage({ id, frames }, frames.map((frame) => frame.buffer));
  } catch {
    self.postMessage({ id, frames: [] });
  }
};

void decodeQRCodesFromCanvas(new ImageData(8, 8), 4)
  .catch(() => undefined)
  .then(() => self.postMessage({ id: -1, frames: [] }));
