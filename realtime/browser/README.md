# Browser microphone streaming

This example captures a microphone in the browser while keeping the permanent
API key on a small Node.js server. The server mints a short-lived token for each
new browser connection.

## Run

```bash
cd realtime/browser
npm install
cp .env.example .env
# Replace your_api_key_here in .env with your API key.
npm start
```

Open [http://localhost:3000](http://localhost:3000), select **Start mic**, allow
microphone access, speak, and select **Stop**. The emotion-aware enriched
transcript appears first, with a clean plain-ASR transcript below it. Both
update while recording and finalize after Stop.

Expected terminal output:

```text
Open http://localhost:3000
```

The permanent key is read only by `server.mjs`. The browser receives an `ek_...`
token that is valid for opening a connection for five minutes. For production,
authenticate your users and rate-limit `/api/token` before issuing a token.
