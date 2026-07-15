# EmoASR realtime examples

Vanilla ASR gives you the words. We are trying to keep more of the human signal
around them: emotion, tone, pauses, emphasis, stress, and accent.

Already have realtime STT in a voice agent or another workflow? This repo is
the shortest path to swapping in EmoASR and seeing whether that extra
context is useful. The examples are deliberately small enough to run, read,
and remix without digging through a full demo application.

Want to hear it first? Try the microphone demo at
[realtime.kittenmldemo.com](https://realtime.kittenmldemo.com/).

## Swap it in

The endpoint follows the OpenAI Realtime transcription event shape. In an
existing OpenAI client, change the base URL and model:

```text
Base URL: https://realtime.kittenmldemo.com/v1
Model:    emokittenasr-realtime
```

## Pick an example

| Runtime | Input | Start here |
| --- | --- | --- |
| Python | Prerecorded audio streamed in realtime | [`realtime/python`](realtime/python) |
| Node.js | Prerecorded audio streamed in realtime | [`realtime/javascript`](realtime/javascript) |
| Browser | Live microphone with secure temporary-token auth | [`realtime/browser`](realtime/browser) |

Each example has its own short README with commands that can be pasted into a
terminal. A small LibriSpeech sample is included, so the Python and Node.js
examples run without finding an audio file first.

## Realtime API basics

- Audio is 24 kHz, mono, signed PCM16.
- Send audio in paced one-second chunks. The final chunk may be shorter.
- Send `input_audio_buffer.commit` when the input is finished.
- Read live text from
  `conversation.item.input_audio_transcription.delta`.
- Read final text from
  `conversation.item.input_audio_transcription.completed`.

These examples prioritize EmoASR's enriched `text`, which includes
emotion, tone, pause, and stress markup. They also display the clean transcript
from the OpenAI-compatible `delta` and `transcript` fields. Structured `tags`
and `accent` remain available on the same events. See the
[`Transcript events`](docs/transcript-events.md) reference for field semantics,
partial revisions, enriched markup, and errors.

## Authentication

Use a permanent `sk_...` API key only in trusted server, desktop, or command
line code. Each example includes a `.env.example`; copy it to `.env` and
replace `your_api_key_here` with your key.

Never commit a key or embed one in public browser JavaScript. The browser
example keeps the permanent key on its small Node.js server and sends the
browser a short-lived token.

## Default API limits

Limits apply per API key unless a different allowance has been assigned.

| Limit | Default |
| --- | ---: |
| Concurrent active sessions | 3 |
| Concurrent active sessions per IP address | 2 |
| Audio per hour | 60 minutes |
| Session starts per hour | 30 |
| Maximum session duration | 600 seconds (10 minutes) |

## Bring your own audio

The file examples consume headerless PCM. Convert any common input with
FFmpeg:

```bash
ffmpeg -y -i input.wav -ac 1 -ar 24000 -f s16le input.pcm
```

Then pass `input.pcm` to either file-streaming example.

Only realtime examples are included today. A future non-realtime file upload
API would live in a separate `batch/` directory.

## Help us break it

This is a beta, and we are still a little way from the open-source release.
Honest feedback is the point of sharing it early. Try your accents, noisy
rooms, crosstalk, code-switching, and real voice-agent traffic.

The most useful reports include:

- The language, accent, and audio conditions.
- The transcript you expected and the transcript you received.
- Whether the emotion, tone, pause, and emphasis tags match what you hear.
- The request ID, so we can trace the session.

Please do not include API keys or sensitive audio in an issue.
