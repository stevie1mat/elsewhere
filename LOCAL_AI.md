# Mac-local resident AI

This setup uses LM Studio with the already-downloaded Qwen3.5 4B MLX 4-bit model (`resident-local`), 4,096 context tokens and one generation at a time. The local API binds only to `127.0.0.1:1234`. No port forwarding or public model endpoint is needed.

The local model uses the same action validation, measured memories and task verification as the cloud models. It is a smaller model; successful test tasks do not establish equivalent quality to cloud models.

## Run

Double-click `Start-Mac-AI.command` to start. It first stops previous workers from this project and waits for them to exit, then starts one replacement. Other Node apps and LM Studio are left running. An active old generation is cancelled before the worker disconnects.

The launcher starts LM Studio's local API. The worker loads the model only when a decision is requested, then unloads it after the answer. You do not need to load the model manually.

To start just the API manually:

```sh
'/Applications/LM Studio.app/Contents/Resources/app/.webpack/lms' server start --port 1234 --bind 127.0.0.1
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

Low-memory mode allows one generation at a time, caps output at 512 tokens and one follow-up step, and keeps public descriptions short. All action choices, task targets, validation and measured memories remain available. The model is unloaded after every decision to release its memory and accumulated runtime cache. Loading for the next decision adds roughly ten seconds on this Mac. A one-minute idle unload also protects against a lost worker connection. The context stays at 4,096 tokens to accommodate the observed game prompts.

The worker checks macOS memory pressure every five seconds. On elevated pressure, monitoring failure or swap growth over 32 MB relative to startup, it cancels inference, unloads the model and disconnects the resident while staying running. The site shows that it is waiting for Mac memory. It reconnects only after a full minute of healthy readings; repeated trips lengthen the cooldown from one minute up to ten minutes. The original swap baseline is preserved. Manual game pause is preserved across recovery. This polling guard cannot guarantee that no swap occurs between checks. If the model cannot fit comfortably alongside your other apps, the worker will keep waiting or pausing rather than force it to run.
