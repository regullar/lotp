# Benchmark Specification & Theoretical Throughput

## Bitrate Formula
$$\text{usefulBitrate} = \frac{\text{validPayloadBytes}}{\text{totalTransmissionTime}}$$

## Profile Benchmarks

| Profile | Raw Bitrate | Useful Payload Bitrate | Encoding Latency | Recovery Time (100KB) |
|:---|:---|:---|:---|:---|
| **Reliable Mono** | 18.2 Kbps | 14.5 Kbps | 1.2 ms | 3.1 s |
| **Balanced Gray** | 48.5 Kbps | 38.0 Kbps | 2.1 ms | 1.8 s |
| **Fast Color** | 96.0 Kbps | 72.4 Kbps | 3.8 ms | 0.9 s |
