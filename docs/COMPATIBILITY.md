# Browser & Hardware Compatibility Matrix

| Browser / OS | Camera Constraints | requestVideoFrameCallback | OffscreenCanvas | Status |
|:---|:---|:---|:---|:---|
| **Chrome Android** | Full rear camera support | Supported | Supported | Full |
| **Chrome / Edge Desktop** | Full support | Supported | Supported | Full |
| **Safari iOS / macOS** | Standard getUserMedia | Fallback (rAF) | Fallback | Graceful Degradation |
| **Firefox Desktop** | Standard getUserMedia | Fallback | Supported | Full |
