# Transcript events

EmoKittenASR follows the OpenAI Realtime transcription event shape and adds
emotion-aware transcript fields. This page describes the events returned after
a connection is already configured and receiving audio. For complete Python,
Node.js, and browser integrations, use the examples under [`realtime/`](../realtime/).

## Event flow

| Event | Meaning |
| --- | --- |
| `session.created` | The WebSocket is connected and the session has an ID. |
| `session.updated` | The server accepted the `session.update` configuration. |
| `conversation.item.input_audio_transcription.delta` | A mutable partial transcript snapshot is available. |
| `conversation.item.input_audio_transcription.completed` | The committed transcript is final. |
| `error` | The session could not continue or an event was invalid. |

The public API currently uses manual finalization: send
`input_audio_buffer.commit` after the last audio message, then wait for the
completed event. Internal speech segmentation and VAD still run while audio is
streaming, but public `speech_started` and `speech_stopped` events are not
emitted.

## Partial transcript

```json
{
  "type": "conversation.item.input_audio_transcription.delta",
  "event_id": "evt_...",
  "item_id": "request_...",
  "content_index": 0,
  "delta": " difference reigned",
  "session_id": "request_...",
  "request_id": "request_...",
  "text": "[low][slow]A (cold), lucid indifference reigned[/slow][/low]",
  "enriched_text": "[low][slow]A (cold), lucid indifference reigned[/slow][/low]",
  "clean_text": "A cold, lucid indifference reigned",
  "accent": "",
  "tags": [
    {"type": "tag", "label": "low", "start": 0, "end": 5},
    {"type": "tag", "label": "slow", "start": 5, "end": 11},
    {"type": "tag", "label": "slow", "start": 47, "end": 54},
    {"type": "tag", "label": "low", "start": 54, "end": 60},
    {"type": "stress", "label": "stress", "start": 13, "end": 19}
  ],
  "is_final": false
}
```

| Field | Meaning |
| --- | --- |
| `type` | Event discriminator. |
| `event_id` | Unique ID for this server event. |
| `item_id` | Correlates partial and completed events for the input item. |
| `content_index` | Content position within the item; currently `0`. |
| `delta` | OpenAI-compatible clean suffix. Append it only when using a delta-based integration. It can be empty when the latest partial revises earlier words or only changes enrichment. |
| `clean_text` | Current cumulative plain transcript snapshot. Replace the previous clean partial with this value. |
| `text` | Current cumulative enriched EmoKittenASR transcript. |
| `enriched_text` | Explicit alias for `text`. |
| `accent` | Best-effort accent classification. It can be empty or change while speech is active. |
| `tags` | Parsed markup ranges within the current enriched transcript. |
| `is_final` | Always `false` on a partial event. |
| `session_id` | ID of the realtime session. |
| `request_id` | ID to include when reporting a session to KittenML. |

Partial transcripts are drafts. `clean_text`, `text`, `enriched_text`,
`accent`, and `tags` may all change when more audio arrives. For a live UI,
replace the displayed partial with each cumulative snapshot; do not concatenate
`clean_text` or `enriched_text` values.

`delta` remains available for existing OpenAI-style consumers. It contains only
new clean text when the new hypothesis extends the previously emitted clean
text. When the model revises existing words, `delta` is empty and `clean_text`
contains the useful replacement snapshot.

An empty first partial is valid and can be ignored.

## Completed transcript

```json
{
  "type": "conversation.item.input_audio_transcription.completed",
  "event_id": "evt_...",
  "item_id": "request_...",
  "content_index": 0,
  "transcript": "A cold, lucid indifference reigned",
  "session_id": "request_...",
  "request_id": "request_...",
  "text": "[low][slow]A (cold), lucid indifference reigned[/slow][/low]",
  "enriched_text": "[low][slow]A (cold), lucid indifference reigned[/slow][/low]",
  "clean_text": "A cold, lucid indifference reigned",
  "accent": "General American",
  "tags": [
    {"type": "tag", "label": "low", "start": 0, "end": 5},
    {"type": "tag", "label": "slow", "start": 5, "end": 11},
    {"type": "tag", "label": "slow", "start": 47, "end": 54},
    {"type": "tag", "label": "low", "start": 54, "end": 60},
    {"type": "stress", "label": "stress", "start": 13, "end": 19}
  ],
  "is_final": true
}
```

The completed event is authoritative. Replace any partial UI state with:

- `transcript` or `clean_text` for the final plain transcript.
- `enriched_text` or `text` for the final emotion-aware transcript.
- `accent` and `tags` from the completed event, rather than values cached from
  an earlier partial.

Unlike a partial event, a completed event has `transcript` and does not have
`delta`.

## Enriched markup

Enrichment is model output and can evolve while the transcript is partial.

| Form | Meaning |
| --- | --- |
| `[label]speech[/label]` | Emotion, tone, or delivery label covering a span. |
| `[pause_short]`, `[pause_medium]`, `[pause_long]` | Audible pauses of increasing duration. |
| `(word)`, `((word))`, `(((word)))` | Stress or emphasis, with one to three levels. |

Labels such as `low`, `slow`, `soft`, or `raspy` describe the associated speech
span. Treat labels as model output rather than a closed enum.

Each entry in `tags` has a half-open range: `start` is inclusive and `end` is
exclusive. The range points into that event's `enriched_text`. Opening and
closing bracket tags are separate entries; parenthesized emphasis produces a
`stress` entry. Positions can move between partials, so discard old ranges when
a new snapshot arrives.

`tags` describes markup structure. It does not provide confidence scores,
audio timestamps, or speaker diarization.

## Error event

Errors received after the WebSocket is accepted use this shape:

```json
{
  "type": "error",
  "event_id": "evt_...",
  "error": {
    "type": "server_error",
    "code": "upstream_error",
    "message": "Realtime upstream failed."
  },
  "session_id": "request_...",
  "request_id": "request_..."
}
```

Use `error.code` for program logic, show or log `error.message`, and retain the
`request_id` for support. Authentication, quota, and connection failures may
instead reject the HTTP or WebSocket handshake before an event can be sent.

## Public contract

The OpenAI-compatible fields are `delta` on partial events and `transcript` on
completed events. `text`, `enriched_text`, `clean_text`, `accent`, `tags`,
`is_final`, and `request_id` are EmoKittenASR extensions.

Transcript events intentionally do not expose internal inference, VAD, routing,
or timing metrics. Word timestamps, confidence values, speaker diarization,
public speech-boundary events, and automatic reconnection are not currently
part of this event contract.
