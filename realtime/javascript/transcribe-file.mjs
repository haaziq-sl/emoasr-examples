import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { OpenAIRealtimeWebSocket } from "openai/realtime/websocket";

const MODEL = "emokittenasr-realtime";
const BASE_URL = "https://realtime.kittenmldemo.com/v1";
const SAMPLE_RATE = 24_000;
const BYTES_PER_SECOND = SAMPLE_RATE * 2;
const here = path.dirname(fileURLToPath(import.meta.url));
const audioPath = process.argv[2] || path.join(here, "..", "assets", "sample.pcm");
const language = process.argv[3];
const apiKey = process.env.EMOKITTEN_API_KEY;

if (!apiKey) throw new Error("Copy .env.example to .env and add your API key before running.");

const pcm = fs.readFileSync(audioPath);
const client = new OpenAI({ apiKey, baseURL: BASE_URL });
const realtime = new OpenAIRealtimeWebSocket({ model: MODEL }, client);
const sleep = ms => new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));

await new Promise((resolve, reject) => {
  let previousEnriched = "";
  let previousClean = "";
  const timeout = setTimeout(() => reject(new Error("Timed out waiting for a final transcript.")), 90_000);

  const fail = error => {
    clearTimeout(timeout);
    reject(error instanceof Error ? error : new Error(JSON.stringify(error)));
  };

  realtime.on("session.created", event => {
    console.log(`connected: ${event.session.id}`);
    const transcription = { model: MODEL };
    if (language) transcription.language = language;
    realtime.send({
      type: "session.update",
      session: {
        type: "transcription",
        audio: { input: {
          format: { type: "audio/pcm", rate: SAMPLE_RATE },
          transcription,
          turn_detection: null,
        }},
      },
    });
  });

  realtime.on("session.updated", async () => {
    try {
      const started = performance.now();
      for (let offset = 0; offset < pcm.length; offset += BYTES_PER_SECOND) {
        const chunk = pcm.subarray(offset, Math.min(offset + BYTES_PER_SECOND, pcm.length));
        realtime.send({
          type: "input_audio_buffer.append",
          audio: chunk.toString("base64"),
        });
        const targetMs = (offset + chunk.length) / BYTES_PER_SECOND * 1000;
        await sleep(targetMs - (performance.now() - started));
      }
      realtime.send({ type: "input_audio_buffer.commit" });
    } catch (error) {
      fail(error);
    }
  });

  realtime.on("conversation.item.input_audio_transcription.delta", event => {
    const enriched = event.text || event.delta || "";
    const clean = event.clean_text || event.delta || "";
    if (enriched && enriched !== previousEnriched) {
      previousEnriched = enriched;
      console.log(`enriched partial: ${enriched}`);
    }
    if (clean && clean !== previousClean) {
      previousClean = clean;
      console.log(`clean partial: ${clean}`);
    }
  });

  realtime.on("conversation.item.input_audio_transcription.completed", event => {
    console.log(`enriched final: ${event.text || event.transcript || ""}`);
    console.log(`clean final: ${event.clean_text || event.transcript || ""}`);
    clearTimeout(timeout);
    realtime.close();
    resolve();
  });

  realtime.on("error", fail);
});
