# DVILR AI1

DVILR AI1 is a multi-model chat app that routes requests to open models through Hugging Face Inference Providers.

## Model modes

| Mode | Default model | Use |
|---|---|---|
| Auto | DVILR router | Picks a tier from the prompt |
| Instant | `openbmb/MiniCPM5-2B` | Fast/simple prompts |
| Easy | `google/gemma-3-4b-it` | Everyday chat |
| Medium | `Qwen/Qwen3.8-27B` | Coding and reasoning |
| High | `Qwen/Qwen3.8-Flash-Next` | Harder/longer work |
| Research | `deepseek-ai/DeepSeek-V4.1-Flash` | Deep analysis |

The router automatically falls back to a lighter configured model if the selected model is unavailable from Hugging Face's current inference providers.

## Security

The Hugging Face token is used only in server-side code. Never put `HF_TOKEN` in frontend JavaScript or commit a real token to this repository.

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to your host's environment settings and set:

   ```bash
   HF_TOKEN=hf_your_token
   ```

3. The token needs permission to call Hugging Face Inference Providers.

4. For Gemma, your Hugging Face account may need to accept Google's Gemma access terms.

5. Run the frontend:

   ```bash
   npm run dev
   ```

For local serverless API emulation, use your deployment platform's local tooling (for example Netlify Dev or Vercel Dev).

## Netlify

- Build command: `npm run build`
- Publish directory: `dist`
- Add `HF_TOKEN` in **Site configuration → Environment variables**.
- `netlify.toml` redirects `/api/chat` to the included Netlify Function.

## Vercel

- Import this repository.
- Framework preset: Vite.
- Add `HF_TOKEN` under project environment variables.
- The included `api/chat.js` serverless function handles `/api/chat`.

## Optional model overrides

You can swap any model without changing source code:

```bash
HF_MODEL_INSTANT=openbmb/MiniCPM5-2B
HF_MODEL_EASY=google/gemma-3-4b-it
HF_MODEL_MEDIUM=Qwen/Qwen3.8-27B
HF_MODEL_HIGH=Qwen/Qwen3.8-Flash-Next
HF_MODEL_RESEARCH=deepseek-ai/DeepSeek-V4.1-Flash
```

## Notes

Open weights do not mean unlimited free hosted inference. Hugging Face Inference Providers require an eligible token/credits and model/provider availability can change. If a particular model is not currently served, DVILR's fallback chain will try a lighter configured model.
