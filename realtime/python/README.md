# Python realtime file streaming

This example uses the official OpenAI Python client and streams the included
audio in paced one-second chunks.

## Run

```bash
cd realtime/python
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
# Replace your_api_key_here in .env with your API key.
python transcribe_file.py
```

Expected output has this shape:

```text
connected: <session-id>
enriched partial: [low][slow]A (cold), [pause_short] (lucid)...[/slow][/low]
clean partial: A cold lucid indifference...
enriched final: [low][slow]A (cold), [pause_short] (lucid)...[/slow][/low]
clean final: A cold lucid indifference reigned in his soul.
```

Enriched output is printed first. Its markup carries emotion, tone, pause, and
stress information; clean output removes that markup. The wording and tags can
vary slightly because this is model output.

## Use your own audio

Convert it to 24 kHz mono PCM16, then pass the resulting file:

```bash
ffmpeg -y -i input.wav -ac 1 -ar 24000 -f s16le input.pcm
python transcribe_file.py input.pcm
```

Pass `--language es` or another supported language code when a language hint
is useful. Omit `--language` for automatic detection.
