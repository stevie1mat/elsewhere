# Training ground

Open `/training` on the existing game host, or use Training ground in the city sidebar/dashboard. It uses the existing login and server; no separate Site, account, database, assets, or model is created.

The first task is park the bicycle, collect one €4 meal, sit and eat. The scene renders only the existing Explorer/bicycle, shared café furniture, and a meal counter on a small pad. The practice scene has its own resident, objects, collision geometry, needs and wallet. Trials cannot spend the live resident's money or change its inventory/position. An existing live activity may continue; new autonomous model requests wait while the shared model slot is used by a trial.

## Evaluation

AI-planner mode calls `brain.trainingDecision`, not chat or phrase parsing. Proposals use the real model connection and the restricted practice context. Invalid proposals remain visible as rejected decisions. Their validation error is supplied to the next model call so it can correct itself within the same trial; no command is silently rewritten. A stationary visit is interrupted after three simulation seconds with measured no-progress feedback, instead of spending the full observation period. Explicit command examples explain that action=eat with parameters.value=seated executes the meal sequence, while visit only travels/observes. Commands execute through the same resident executor as the city. Maximum five commands and 90 seconds of simulation per trial. Model time is separate from simulation time. Provider/memory interruptions are marked interrupted, never successful learning.

State checks require a parked bicycle, a purchased meal, a seated pose while consuming, hunger relief of at least 10, and a completed meal. A positive trial must spend exactly €4. Unsupported claims such as saying “I'm seated” before sitting fail the truthful-reply check. Inspect model decisions, execution feedback, measured results and token usage in the attempt details.

Four negative cases remove chairs, remove food, remove money, or block the counter. A correctly blocked result requires an explanation matching the actual missing condition and no fabricated consumption. That is a successful diagnosis, not a completed meal.

## Memory and skills

Recent practice lessons are supplied as past evidence on the next trial. A reusable seated-meal skill unlocks only after successful planner trials with three distinct instructions plus correct diagnosis of all four negative cases. A single pass or a scripted replay cannot unlock a skill. The learned program and evidence references are stored under the existing save's `training` field; verified skill metadata is available to the live planner, which must still check current requirements.

Skill-replay mode tests the verified command program separately from model planning. Neither mode changes model weights. Export trials downloads the public decisions, initial scenes, measured traces, outcomes and verified skills as JSON for review before any future fine-tuning. No private reasoning traces are collected.

Only one trial/model request runs at a time. Cancel stops the practice simulation; an outstanding generation may need to finish releasing the shared connection before another trial starts. Server restarts mark unfinished attempts interrupted. Viewing the page itself never starts inference.

## Verification

`tests/training.test.js` checks physical execution, isolation, negative cases, truthful claims, cancellation, skill promotion and phrase-shortcut bypass using explicitly injected fixtures. `tests/training-http.test.js` checks authentication and the existing server routes. Fixture passes verify engineering behavior, not real-model task competence; real model scores are collected when using the page.
