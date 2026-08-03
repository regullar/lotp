import { renderQRCodeImageData } from '@raptorqr/core/qr/qr_encoder_browser';
import { RAPTOR_MODE } from '../protocol/raptorTransport';

self.onmessage = async (event: MessageEvent<Uint8Array[]>) => {
  try {
    const tiles = await Promise.all(event.data.map((packet) =>
      renderQRCodeImageData(packet, RAPTOR_MODE.version, RAPTOR_MODE.eccLevel, RAPTOR_MODE.scale)
    ));
    const tileSize = tiles[0]?.width ?? 0;
    if (!tileSize || tiles.some((tile) => tile.width !== tileSize || tile.height !== tileSize)) {
      throw new Error('Некорректный размер QR.');
    }

    const side = tileSize * 2;
    const output = new Uint8ClampedArray(side * side * 4);
    tiles.forEach((tile, index) => {
      const offsetX = (index % 2) * tileSize;
      const offsetY = Math.floor(index / 2) * tileSize;
      for (let row = 0; row < tileSize; row++) {
        const sourceStart = row * tileSize * 4;
        const targetStart = ((offsetY + row) * side + offsetX) * 4;
        output.set(tile.data.subarray(sourceStart, sourceStart + tileSize * 4), targetStart);
      }
    });
    self.postMessage({ buffer: output.buffer, side }, [output.buffer]);
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'QR generation failed' });
  }
};
