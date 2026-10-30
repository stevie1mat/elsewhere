# Mac-local resident AI

This setup uses LM Studio with the already-downloaded Qwen3.5 4B MLX 4-bit model (`resident-local`), 4,096 context tokens and one generation at a time. The local API binds only to `127.0.0.1:1234`. No port forwarding or public model endpoint is needed.

The local model uses the same action validation, measured memories and task verification as the cloud models. It is a smaller model; successful test tasks do not establish equivalent quality to cloud models.

## Run

Start LM Studio and load the model if it is not already running:

```sh
'/Applications/LM Studio.app/Contents/Resources/app/.webpack/lms' server start --port 1234 --bind 127.0.0.1
'/Applications/LM Studio.app/Contents/Resources/app/.webpack/lms' load qwen3.5-4b-mlx --context-length 4096 --identifier resident-local --parallel 1 --ttl 300 --yes
```

From this project:

```sh
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run ai:local:check
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run ai:mac
```

The worker signs in with the game's existing access code (`PRIVATE_ACCESS_CODE` in ignored `.env`, or the game's current default). It makes outbound HTTPS requests to `PRIVATE_SERVER_URL` (defaults to the existing Render service). Prompts are processed on the Mac and validated decisions are returned to Render. Supabase remains the sole hosted save; this does not start a second game simulation or overwrite the save from a local server.

Connecting preserves manual pause. Resume through the game's sidebar when ready. Stopping the worker, closing LM Studio or sleeping the Mac makes local AI unavailable and pauses the hosted resident. Local mode does not automatically spend cloud-provider quota.

To switch the hosted resident back to cloud providers:

```sh
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run ai:mac -- --cloud
```

## Local model configuration

The model's existing tokenizer template was backed up to `tokenizer_config.json.resident-original` beside its original file, then prefixed with `{% set enable_thinking = false %}`. This model/runtime did not apply thinking-off API settings and otherwise returned empty public responses. The backup allows restoring the original template; reload the model after changes.

The local adapter uses the Qwen chat template through the completion endpoint to avoid an MLX chat-parser issue. Do not point this adapter at an unrelated model without adapting its template.

Local tokens are counted for research but do not consume Groq/Mistral quota. Model computation requires RAM, power and an awake Mac. The local service and model remain installed after stopping the worker.

The reduced context and single-request limit reduce memory use. The model unloads after five idle minutes; rerun the launcher to load it again. Stop local inference if memory pressure rises or swap begins increasing.

The worker checks macOS memory pressure every five seconds. It cancels inference, unloads the model and disconnects when pressure rises or swap increases by more than 32 MB relative to startup. This polling guard cannot guarantee that no swap occurs between checks.
