import { decodeQRCodesFromCanvas, type QrDecodeResult } from '@raptorqr/core/qr/qr_decode';

function extractSubImage(
  source: ImageData,
  sx: number,
  sy: number,
  sw: number,
  sh: number
): ImageData {
  const data = new Uint8ClampedArray(sw * sh * 4);
  const src32 = new Uint32Array(source.data.buffer, source.data.byteOffset, source.data.byteLength / 4);
  const dst32 = new Uint32Array(data.buffer, data.byteOffset, data.byteLength / 4);
  for (let y = 0; y < sh; y++) {
    const srcOffset = (sy + y) * source.width + sx;
    const dstOffset = y * sw;
    dst32.set(src32.subarray(srcOffset, srcOffset + sw), dstOffset);
  }
  return new ImageData(data, sw, sh);
}

self.onmessage = async (event: MessageEvent) => {
  const { id, buffer, width, height } = event.data as {
    id: number;
    buffer: ArrayBuffer;
    width: number;
    height: number;
  };
  try {
    const image = new ImageData(new Uint8ClampedArray(buffer), width, height);
    const decodeOptions = {
      maxSymbols: 4,
      binarizer: 'LocalAverage' as const,
      tryHarder: true,
      tryRotate: true,
      tryInvert: true,
      tryDownscale: false,
    };

    const fullResults = await decodeQRCodesFromCanvas(image, decodeOptions);
    const allResults: QrDecodeResult[] = [...fullResults];

    if (allResults.length < 4 && width >= 32 && height >= 32) {
      const hw = Math.min(width, Math.max(1, Math.floor(width * 0.55)));
      const hh = Math.min(height, Math.max(1, Math.floor(height * 0.55)));
      const x1 = Math.max(0, width - hw);
      const y1 = Math.max(0, height - hh);

      const quads = [
        { sx: 0, sy: 0 },
        { sx: x1, sy: 0 },
        { sx: 0, sy: y1 },
        { sx: x1, sy: y1 },
      ];

      const quadResultsArray = await Promise.all(
        quads.map((q) => {
          const subImage = extractSubImage(image, q.sx, q.sy, hw, hh);
          return decodeQRCodesFromCanvas(subImage, { ...decodeOptions, maxSymbols: 1 });
        })
      );

      for (const quadRes of quadResultsArray) {
        allResults.push(...quadRes);
      }
    }

    const seen = new Set<string>();
    const frames: Uint8Array[] = [];
    for (const result of allResults) {
      if (!result.bytes || !result.bytes.length) continue;
      const key = result.bytes.toString();
      if (!seen.has(key)) {
        seen.add(key);
        frames.push(result.bytes);
      }
    }

    self.postMessage({ id, frames }, frames.map((frame) => frame.buffer));
  } catch {
    self.postMessage({ id, frames: [] });
  }
};

void decodeQRCodesFromCanvas(new ImageData(8, 8), 4)
  .catch(() => undefined)
  .then(() => self.postMessage({ id: -1, frames: [] }));

