import argparse
import base64
import os
import time
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI


MODEL = "emokittenasr-realtime"
BASE_URL = "https://realtime.kittenmldemo.com/v1"
SAMPLE_RATE = 24_000
BYTES_PER_SECOND = SAMPLE_RATE * 2  # Mono PCM16 uses two bytes per sample.
DEFAULT_AUDIO = Path(__file__).resolve().parents[1] / "assets" / "sample.pcm"


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Stream PCM audio to EmoKittenASR.")
    parser.add_argument("audio", nargs="?", type=Path, default=DEFAULT_AUDIO)
    parser.add_argument("--language", help="Optional language hint, for example en or es.")
    return parser.parse_args()


def main() -> None:
    args = arguments()
    load_dotenv(Path(__file__).with_name(".env"))
    api_key = os.environ.get("EMOKITTEN_API_KEY")
    if not api_key:
        raise SystemExit("Copy .env.example to .env and add your API key before running.")

    pcm = args.audio.read_bytes()
    client = OpenAI(api_key=api_key, base_url=BASE_URL)

    with client.realtime.connect(model=MODEL) as connection:
        created = connection.recv()
        if created.type != "session.created":
            raise RuntimeError(f"Expected session.created, received {created.type}")
        print(f"connected: {created.session.id}")

        transcription = {"model": MODEL}
        if args.language:
            transcription["language"] = args.language

        connection.send({
            "type": "session.update",
            "session": {
                "type": "transcription",
                "audio": {
                    "input": {
                        "format": {"type": "audio/pcm", "rate": SAMPLE_RATE},
                        "transcription": transcription,
                        "turn_detection": None,
                    }
                },
            },
        })
        updated = connection.recv()
        if updated.type != "session.updated":
            raise RuntimeError(f"Expected session.updated, received {updated.type}")

        stream_started = time.monotonic()
        for offset in range(0, len(pcm), BYTES_PER_SECOND):
            chunk = pcm[offset : offset + BYTES_PER_SECOND]
            connection.send({
                "type": "input_audio_buffer.append",
                "audio": base64.b64encode(chunk).decode("ascii"),
            })
            target = (offset + len(chunk)) / BYTES_PER_SECOND
            time.sleep(max(0, target - (time.monotonic() - stream_started)))

        connection.send({"type": "input_audio_buffer.commit"})
        previous_enriched = ""
        previous_clean = ""
        while True:
            event = connection.recv()
            if event.type == "conversation.item.input_audio_transcription.delta":
                enriched = str(getattr(event, "text", "") or event.delta or "")
                clean = str(getattr(event, "clean_text", "") or event.delta or "")
                if enriched and enriched != previous_enriched:
                    previous_enriched = enriched
                    print(f"enriched partial: {enriched}")
                if clean and clean != previous_clean:
                    previous_clean = clean
                    print(f"clean partial: {clean}")
            elif event.type == "conversation.item.input_audio_transcription.completed":
                enriched = str(getattr(event, "text", "") or event.transcript or "")
                clean = str(getattr(event, "clean_text", "") or event.transcript or "")
                print(f"enriched final: {enriched}")
                print(f"clean final: {clean}")
                return
            elif event.type == "error":
                raise RuntimeError(str(event))


if __name__ == "__main__":
    main()
