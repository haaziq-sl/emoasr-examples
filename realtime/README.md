# Realtime transcription

Pick the example closest to your current application:

- [`python/`](python/) uses the official OpenAI Python client.
- [`javascript/`](javascript/) uses the official OpenAI JavaScript client in
  Node.js.
- [`browser/`](browser/) captures a microphone and demonstrates the secure
  browser token flow.

The Python and Node.js examples deliberately stream the included file at wall
clock speed. This exercises the same paced realtime path used by a microphone;
it is not a batch upload.

All examples use manual commit at the public protocol boundary. EmoKittenASR
still performs server-side VAD and speech-segment decoding internally.

Each example shows the enriched emotion-aware transcript first and the clean
plain-ASR transcript second.
