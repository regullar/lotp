# LumenLink Software Architecture

## Pipeline Overview

```mermaid
flowchart LR
    subgraph Sender
        Files --> Container --> AES256 --> LTEncoder --> RS -> Renderer
    end
    subgraph Receiver
        Camera --> WebWorker -> CV_Detector --> Homography --> Sampler --> RS_Decoder --> LTDecoder --> Unpacker --> Save
    end
```

### Components
1. **Protocol Core** (`src/protocol/`): Pure functional TS modules handling container packing, AES-256-GCM, LT Fountain encoding, Reed-Solomon ECC, and CRC32C validation.
2. **Optical CV Engine** (`src/optical/`): Direct Linear Transform (DLT) 3x3 Homography solver, corner fiducial detector, palette calibrator, and trimmed-mean sub-pixel cell sampler.
3. **Web Worker Threading** (`src/workers/`): Offloads video frame analysis to background threads to guarantee a smooth 60 FPS UI.
