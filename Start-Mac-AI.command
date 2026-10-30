#!/bin/zsh
set -e
cd "$(dirname "$0")"
mac_ai_node=/opt/homebrew/opt/node@22/bin/node
if [[ ! -x "$mac_ai_node" ]]; then mac_ai_node="$(command -v node)"; fi
"$mac_ai_node" scripts/stop-mac-workers.js
mac_ai_lms='/Applications/LM Studio.app/Contents/Resources/app/.webpack/lms'
env -u ELECTRON_RUN_AS_NODE open -a 'LM Studio'
"$mac_ai_lms" server start --port 1234 --bind 127.0.0.1
exec "$mac_ai_node" scripts/mac-ai-worker.js
