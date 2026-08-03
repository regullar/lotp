const PREFIX = 'LOTP1:';

export function encodeQRFrame(header: Uint8Array, tile: Uint8Array): string {
  const bytes = new Uint8Array(header.length + tile.length);
  bytes.set(header);
  bytes.set(tile, header.length);

  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return PREFIX + btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodeQRFrame(text: string): Uint8Array | null {
  const encoded = text.startsWith(PREFIX) ? text.slice(PREFIX.length) : '';
  if (!encoded || encoded.length > 4096 || !/^[A-Za-z0-9_-]+$/.test(encoded)) return null;

  try {
    const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(encoded.length / 4) * 4, '='));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}
