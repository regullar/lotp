import { renderQRCodeImageData } from '@raptorqr/core/qr/qr_encoder_browser';
import { RAPTOR_ECC_LEVEL } from '../protocol/raptorTransport';

self.onmessage = async (event: MessageEvent<{ packets: Uint8Array[]; version: number }>) => {
  try {
    const { packets, version } = event.data;
    const grid = packets.length === 1 ? 1 : 2;
    const moduleCountWithMargin = 17 + version * 4 + 8;
    const scale = Math.max(2, Math.ceil(580 / grid / moduleCountWithMargin));
    const tiles = await Promise.all(packets.map((packet) =>
      renderQRCodeImageData(packet, version, RAPTOR_ECC_LEVEL, scale)
    ));
    const tileSize = tiles[0]?.width ?? 0;
    if (!tileSize || tiles.some((tile) => tile.width !== tileSize || tile.height !== tileSize)) {
      throw new Error('Некорректный размер QR.');
    }

    const side = tileSize * grid;
    const output = new Uint8ClampedArray(side * side * 4);
    tiles.forEach((tile, index) => {
      const offsetX = (index % grid) * tileSize;
      const offsetY = Math.floor(index / grid) * tileSize;
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
