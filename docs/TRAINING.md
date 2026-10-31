# Training ground

Open `/training` on the existing game host, or use Training ground in the city sidebar/dashboard. It uses the existing login and server; no separate Site, account, database, assets, or model is created.

The first task is park the bicycle, collect one €4 meal, sit and eat. The scene renders only the existing Explorer/bicycle, shared café furniture, and a meal counter on a small pad. The practice scene has its own resident, objects, collision geometry, needs and wallet. Trials cannot spend the live resident's money or change its inventory/position. An existing live activity may continue; new autonomous model requests wait while the shared model slot is used by a trial.

## Evaluation

AI-planner mode calls `brain.trainingDecision`, not chat or phrase parsing. Proposals use the real model connection and the restricted practice context. Invalid proposals remain visible as rejected decisions. Their validation error is supplied to the next model call so it can correct itself within the same trial; no command is silently rewritten. A stationary visit is interrupted after three simulation seconds with measured no-progress feedback, instead of spending the full observation period. Training uses individual actions: dismount, walk, purchase_meal, collect_meal, sit, eat, inspect and stop. No command chooses the next action. Combined meal shortcuts and queued plans are rejected. The model receives current inventory, pose, object IDs and the actual previous action result. Commands execute through the same resident executor as the city. Maximum sixteen commands and 90 seconds of simulation per trial. Model time is separate from simulation time. Provider/memory interruptions are marked interrupted, never successful learning.

State checks require a parked bicycle, a purchased meal, a seated pose while consuming, hunger relief of at least 10, and a completed meal. A positive trial must spend exactly €4. Unsupported claims such as saying “I'm seated” before sitting fail the truthful-reply check. Inspect model decisions, execution feedback, measured results and token usage in the attempt details.

Four negative cases remove chairs, remove food, remove money, or block the counter. A correctly blocked result requires an explanation matching the actual missing condition and no fabricated consumption. That is a successful diagnosis, not a completed meal.

## Memory and skills

Recent practice lessons are supplied as past evidence on the next trial. A reusable seated-meal skill unlocks only after successful planner trials with three distinct instructions plus correct diagnosis of all four negative cases. A single pass or a scripted replay cannot unlock a skill. The learned program and evidence references are stored under the existing save's `training` field; verified skill metadata is available to the live planner, which must still check current requirements.

Skill-replay mode tests the verified command program separately from model planning. Neither mode changes model weights. Export trials downloads the public decisions, initial scenes, measured traces, outcomes and verified skills as JSON for review before any future fine-tuning. No private reasoning traces are collected.

Only one trial/model request runs at a time. Cancel stops the practice simulation; an outstanding generation may need to finish releasing the shared connection before another trial starts. Server restarts mark unfinished attempts interrupted. Viewing the page itself never starts inference.

## Verification

`tests/training.test.js` checks physical execution, isolation, negative cases, truthful claims, cancellation, skill promotion and phrase-shortcut bypass using explicitly injected fixtures. `tests/training-http.test.js` checks authentication and the existing server routes. Fixture passes verify engineering behavior, not real-model task competence; real model scores are collected when using the page.

The Mac planner emits `{task,target,reply}` for one action at a time. Discovery trials are tagged `atomic-v1`; previous shortcut trials and skills cannot qualify. Atomic food commands share city movement, furniture and consumption physics, but payment and collection require being at the counter and sitting requires reaching the chair. Successful action programs are promoted only after three wording variants and four negative cases; skill replay is separate. The moved-objects scenario tests use of current object targets instead of memorized positions. Restart the Mac worker when its local-client modules change.

The local decoder limits choices by immediate physical preconditions (for example, walking is unavailable while cycling, buying requires reaching the counter, and sitting requires reaching a chair). This is an action-affordance check, not a goal-specific sequence; the model still chooses actions, targets, and when to stop. Invalid actions from other providers are rejected by the executor.

Teacher mode accepts one authenticated `teacher_step` with trialId, expectedDecisions and `{task,target,reply}`. It never calls the student and waits for each action result. Export includes verified teacher examples only from completed, truthful, passed demonstrations. Student mode includes the latest verified demonstration as in-context examples. These are demonstration-guided trials, not fine-tuning or independent planner passes; neither teacher nor student mode unlocks an independent skill. Model weights remain unchanged.


Automatic coaching and adapter training

Select Automatic coaching to run the local student with a separate cloud teacher (existing GROQ_API_KEY, default openai/gpt-oss-120b, optional TRAINING_TEACHER_MODEL). The teacher reviews proposals, corrects mistakes or cycles, and validates each action through real simulation. Teacher source, original student proposal, corrections and results remain visible. The interactive Codex chat is not the unattended teacher. Automatic sessions are capped at 12 trials; each trial at 24 decisions and 12 corrections.

Run `npm run training:auto` on the Mac after installing `requirements-training.txt` in `.venv-training`. Enable/resume automatic training on /training. The local daemon collects coached scenarios, retains only teacher-labelled actions from state-verified passed/correctly-blocked trials, and automatically trains a separate QLoRA adapter once there are 24 unique usable examples across at least 3 trials. Whole trials are held out for validation. Failed, fabricated and legacy examples lacking the exact model input are excluded. Reports and labels are persisted separately so the last-30-trial display does not erase the dataset.

Training uses the same non-thinking prompt prefix as the student, prompt masking, token-length validation, batch size 1 and a single attention layer. The local worker is stopped during adapter training and restarted afterward. Memory pressure or swap growth aborts training. Output is under `.training/runs/`; the base model is never overwritten. `candidate` means an adapter checkpoint exists, not that it improved the character or became active. Independent game evaluation and promotion remain required before replacing the live model. This prevents a tiny or regressed fine-tune from silently becoming production. Pause future collection from /training; cancel a current game trial separately. Stop the local daemon to stop adapter training immediately.

MLX reference: https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md
