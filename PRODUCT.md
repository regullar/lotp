# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Everyday privacy-conscious people moving files between devices, especially when they do not want or cannot use a network, cloud service, account, cable, Bluetooth, or NFC.

## Product Purpose

LumenLink transfers arbitrary files directly from one device's screen to another device's camera. Success means a first-time user can confidently choose Send or Receive, complete an optical transfer, and understand that their file never passed through a server.

## Positioning

Private by physics: the transfer is a visible local optical link between a screen and a camera, not a promise made by a remote service.

## Operating Context

One device renders an animated LOTP QR stream while another scans it with a camera. Users may need to calibrate the display/camera pair, inspect browser capabilities, and review local transfer history. The application works locally in the browser after its initial load.

## Capabilities and Constraints

- Sends and receives arbitrary files through animated optical codes.
- Uses error correction and recovery to tolerate lost or damaged frames.
- Supports local encryption and an automatic browser-readiness check.
- Runs as a zero-server offline-capable web application.
- Preserves the existing English/Russian language toggle and all current workflows.
- Camera access requires a secure browser context in production.

## Brand Commitments

- Product name: LumenLink.
- Protocol name: LumenLink Optical Transport Protocol (LOTP v1).
- Voice: plain, trustworthy, technically honest, and free of surveillance or cloud-service theatrics.
- Visual convention: polished privacy-software clarity played straight, with LocalSend and Alaqan as the confirmed craft references.

## Evidence on Hand

- Working send, receive, calibration, and history surfaces in `src/`.
- Protocol, architecture, security, compatibility, and benchmark documentation in `docs/`.
- No testimonials, customer logos, pricing, or independent commercial claims are available and none may be invented.

## Product Principles

- Make the physical transfer path obvious.
- Earn trust through legibility and verifiable behavior.
- Keep the first action as simple as choosing Send or Receive.
- Expose technical depth without making it the entry requirement.
- Preserve local-only operation and user control.

## Accessibility & Inclusion

Core send/receive actions, status, progress, and errors must not rely on color alone. The whole app must remain keyboard operable, readable at mobile sizes, and respectful of reduced-motion preferences.
