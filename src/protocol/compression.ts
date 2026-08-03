export async function compressIfUseful(data: Uint8Array): Promise<{ data: Uint8Array; compressed: boolean }> {
  if (typeof CompressionStream === 'undefined' || data.length === 0) return { data, compressed: false };
  const stream = new Blob([data.slice().buffer]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
  return compressed.length <= data.length * 0.97
    ? { data: compressed, compressed: true }
    : { data, compressed: false };
}

export async function decompress(data: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') throw new Error('Браузер не поддерживает распаковку DEFLATE.');
  const stream = new Blob([data.slice().buffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
