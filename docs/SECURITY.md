# Security & Privacy Specification

## 1. Zero-Server Architecture
LumenLink operates entirely client-side as an offline Progressive Web Application (PWA). No files, images, metadata, or encryption keys are ever transmitted over the network or saved on remote servers.

## 2. Encryption
- **Algorithm**: AES-256-GCM authenticated encryption with 128-bit authentication tags.
- **Key Derivation**: PBKDF2 with SHA-256 (100,000 iterations) and 128-bit cryptographic salt.
- **Nonce Strategy**: 96-bit unique nonces per session/chunk.
