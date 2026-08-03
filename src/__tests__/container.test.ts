import { describe, it, expect } from 'vitest';
import { LOTPContainer } from '../protocol/container/lotpContainer';

describe('LOTP Multi-File Binary Container', () => {
  it('packs and unpacks multiple files with Unicode names', async () => {
    const file1Data = new TextEncoder().encode('Привет, мир! Hello world!');
    const file2Data = new Uint8Array([0, 1, 2, 3, 4, 255, 254, 253]);

    const fakeFiles = [
      {
        file: new File([file1Data], 'документ_test.txt', { type: 'text/plain' }),
        data: file1Data,
      },
      {
        file: new File([file2Data], 'image_sample.bin', { type: 'application/octet-stream' }),
        data: file2Data,
      },
    ];

    const packed = await LOTPContainer.pack(fakeFiles);
    expect(packed.length).toBeGreaterThan(file1Data.length + file2Data.length);

    const unpacked = await LOTPContainer.unpack(packed);
    expect(unpacked.length).toBe(2);

    expect(unpacked[0].name).toBe('документ_test.txt');
    expect(Array.from(unpacked[0].data)).toEqual(Array.from(file1Data));

    expect(unpacked[1].name).toBe('image_sample.bin');
    expect(Array.from(unpacked[1].data)).toEqual(Array.from(file2Data));
  });
});
