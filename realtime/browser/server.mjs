import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import OpenAI from "openai";

const apiKey = process.env.EMOKITTEN_API_KEY;
if (!apiKey) throw new Error("Copy .env.example to .env and add your API key before running.");

const MODEL = "emokittenasr-realtime";
const app = express();
const here = path.dirname(fileURLToPath(import.meta.url));
const client = new OpenAI({
  apiKey,
  baseURL: "https://realtime.kittenmldemo.com/v1",
});

app.post("/api/token", async (_request, response) => {
  try {
    const token = await client.realtime.clientSecrets.create({
      expires_after: { anchor: "created_at", seconds: 300 },
      session: {
        type: "transcription",
        model: MODEL,
        audio: { input: {
          format: { type: "audio/pcm", rate: 24_000 },
          transcription: { model: MODEL },
          turn_detection: null,
        }},
      },
    });
    response.json(token);
  } catch (error) {
    console.error("Could not create browser token:", error.message);
    response.status(502).json({ error: "Could not create browser token." });
  }
});

app.use(express.static(path.join(here, "public")));
const port = Number(process.env.PORT || 3000);
app.listen(port, "127.0.0.1", () => console.log(`Open http://localhost:${port}`));
