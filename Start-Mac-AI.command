#!/bin/zsh
set -e
cd "$(dirname "$0")"
mac_ai_node=/opt/homebrew/opt/node@22/bin/node
if [[ ! -x "$mac_ai_node" ]]; then mac_ai_node="$(command -v node)"; fi
"$mac_ai_node" scripts/stop-mac-workers.js
mac_ai_lms='/Applications/LM Studio.app/Contents/Resources/app/.webpack/lms'
env -u ELECTRON_RUN_AS_NODE open -a 'LM Studio'
"$mac_ai_lms" server start --port 1234 --bind 127.0.0.1
if ! "$mac_ai_node" --input-type=module -e 'const d=await(await fetch("http://127.0.0.1:1234/v1/models")).json();process.exit(d.data.some(m=>m.id==="resident-local")?0:1)'; then
  "$mac_ai_lms" load qwen3.5-4b-mlx --context-length 4096 --identifier resident-local --parallel 1 --ttl 300 --yes
fi
exec "$mac_ai_node" scripts/mac-ai-worker.js
