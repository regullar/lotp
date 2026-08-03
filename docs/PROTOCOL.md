# LumenLink Optical Transport Protocol (LOTP v1) Specification

## 1. Overview & Goals
LOTP v1 is a high-speed, serverless, screen-to-camera optical data transport protocol engineered for unidirectional video feeds. Unlike standard QR code sequences, LOTP v1 is designed from first principles to overcome frame drops, camera motion blur, rolling shutter artifacts, acute viewing angles, and exposure variations without requiring a reverse network channel.

---

## 2. Frame Geometry & Layout Diagram

```text
+-------------------------------------------------------------+
| Quiet Zone Padding                                           |
|  +-----+  [Timing & Palette Rail: W B 25% 50% 75% R G B] +-----+  |
|  | TL  |  .............................................. | TR  |  |
|  | (A) |  .............................................. | (B) |  |
|  +-----+  .............................................. +-----+  |
|  .  [Frame Header: Magic | Version | Seq | Type | CRC]          .  |
|  .  +-------------------+ +-------------------+                 .  |
|  .  | Data Tile 0       | | Data Tile 1       |                 .  |
|  .  | Payload + RS ECC  | | Payload + RS ECC  |                 .  |
|  .  +-------------------+ +-------------------+                 .  |
|  .  ...................................................         .  |
|  +-----+  .............................................. +-----+  |
|  | BL  |  .............................................. | BR  |  |
|  | (C) |  .............................................. | (D) |  |
|  +-----+  [Timing & Palette Rail: W B 25% 50% 75% R G B] +-----+  |
+-------------------------------------------------------------+
```

---

## 3. Key Technical Layers

### 3.1 4 Asymmetric Corner Fiducial Markers
To eliminate rotation and angle ambiguity:
- **Top-Left (TL)**: Solid 3x3 outer ring with center core (Marker A)
- **Top-Right (TR)**: Solid 3x3 square (Marker B)
- **Bottom-Left (BL)**: Alternating grid (Marker C)
- **Bottom-Right (BR)**: Diagonal cross (Marker D)

### 3.2 Error Correction Strategy
- **Inner Layer**: Reed-Solomon GF($2^8$) per data tile to repair damaged cell bits.
- **Interleaving**: Deterministic 2D matrix interleaving across tile cells to prevent glares or rolling shutter lines from destroying consecutive bytes.
- **Outer Layer**: Systematic Luby Transform (LT) Fountain Code with Robust Soliton distribution and peeling decoder.

---

## 4. Transmission Profiles

| Profile | Grid Size | Palette | Target FPS | ECC Power | Best For |
|:---|:---|:---|:---|:---|:---|
| **Reliable** | 16x16 | 1-bit Mono | 20-30 FPS | Heavy (RS-8) | Low-end cameras, distance |
| **Balanced** | 24x24 | 2-bit Gray | 30-60 FPS | Medium (RS-6) | Default recommended |
| **Fast** | 32x32 | 2-bit Color | 60 FPS | Standard (RS-4) | High-end displays & cameras |
| **Turbo** | 40x40 | 2-bit Gray | 60 FPS | Adaptive | Experimental rolling shutter |
