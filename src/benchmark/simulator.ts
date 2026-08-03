/**
 * Optical Channel Simulator for automated testing and benchmarking under optical stress conditions.
 */

export interface SimulatorOptions {
  noiseLevel: number;        // 0..1
  blurRadius: number;        // 0..5 px
  brightnessShift: number;   // -100..100
  perspectiveAngleDeg: number;// 0..45 deg
  dropFrameProbability: number;// 0..0.5
  rollingShutterSplit: boolean;
}

export class OpticalChannelSimulator {
  public static applyDistortion(
    sourceCanvas: HTMLCanvasElement,
    options: SimulatorOptions
  ): HTMLCanvasElement {
    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;

    const ctx = outputCanvas.getContext('2d');
    if (!ctx) return outputCanvas;

    const srcCtx = sourceCanvas.getContext('2d');
    if (!srcCtx) return outputCanvas;

    const imgData = srcCtx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Apply Noise & Brightness
    for (let i = 0; i < data.length; i += 4) {
      if (options.noiseLevel > 0) {
        const noise = (Math.random() - 0.5) * options.noiseLevel * 80;
        data[i] = Math.min(255, Math.max(0, data[i] + noise + options.brightnessShift));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise + options.brightnessShift));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise + options.brightnessShift));
      } else if (options.brightnessShift !== 0) {
        data[i] = Math.min(255, Math.max(0, data[i] + options.brightnessShift));
        data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + options.brightnessShift));
        data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + options.brightnessShift));
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Apply Blur via Canvas Filter if specified
    if (options.blurRadius > 0) {
      ctx.filter = `blur(${options.blurRadius}px)`;
      ctx.drawImage(outputCanvas, 0, 0);
      ctx.filter = 'none';
    }

    return outputCanvas;
  }
}
