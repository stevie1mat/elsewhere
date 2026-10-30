# Assets to implement

Drop candidate models and animations into this folder for review. Files placed here are not automatically usable in the game.

See `backlog.json` for known implementation gaps. These are developer inventory items, not requests invented by the AI.

Resident-authored requests are saved with the resident in Supabase and appear in the frontend under **Assets to implement → Resident requests**. Download the current list there as JSON to bring it into this folder.

For each candidate include its source URL, license, intended interaction, scale and rig information. A usable asset also needs an object registry entry, a reachable approach slot, a supported action, animation/pose support and completion/failure feedback. A model file alone does not implement a skill.

Already supported: registered benches/chairs for sitting and the home bed for lying down. Standing rest without selecting a seat is an action choice, not proof that a bench asset is missing.
