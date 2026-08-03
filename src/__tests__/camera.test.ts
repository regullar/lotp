import { describe, expect, it } from 'vitest';
import { cameraSourceConstraints } from '../hooks/useCamera';

describe('camera source selection', () => {
  it('selects the rear camera without quality constraints influencing the lens', () => {
    expect(cameraSourceConstraints()).toEqual({ facingMode: { exact: 'environment' } });
  });

  it('pins a manually selected physical camera', () => {
    expect(cameraSourceConstraints('main-camera')).toEqual({ deviceId: { exact: 'main-camera' } });
  });
});
