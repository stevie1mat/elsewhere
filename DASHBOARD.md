# Resident dashboard

Open `/dashboard` on the Vercel site or private Render server. It uses the existing game session and access code (default `279279`); it does not create another resident or save. The city sidebar also links to it.

The page refreshes `/api/resident` every three seconds while visible. It never requests an AI decision merely to display data, and its separate bundle does not load the 3D city.

Views cover overview, needs and personality, public intentions and plans, task verification, outcome graphs and memory reuse, activity and phone history, provider health and token usage, registered objects and resident-authored requests, conversation, storage and research exports. Pause, resume, restart AI and chat use the existing authenticated game endpoints. Restarting AI preserves the saved life.

Daily tokens use America/Toronto dates. Only recorded history is shown; old missing history is not reconstructed. The outcome score measures recent activity reward, not intelligence. Perception is simulation data. Public intentions are not internal reasoning traces. Exports include private conversation and recorded model context, so handle them accordingly.

Routing is configured in `vercel.json` and `server/private.js`. `src/private-entry.js` checks the authenticated resident endpoint before loading the dashboard. No access code or provider API key is embedded in the dashboard bundle.
