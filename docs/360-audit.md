# NATIVELY — COMPLETE 360° AUDIT

*Performed by: Claude Sonnet 4.6, acting as Co-Founder, CTO, Principal Architect, Product Strategist, AI Systems Architect, Security Lead, UX Director, Scalability Consultant, and Investor-level Reviewer.*

*Date: 2026-05-15*

---

## 1. EXECUTIVE SUMMARY

Natively is a genuinely impressive piece of engineering. A solo/small-team Electron desktop app that ships: a Rust native audio module with Zero-Copy ABI, a full local RAG pipeline with sqlite-vec, 8 STT providers, 6+ LLM providers, speculative inference, a three-tier intent classifier (regex → ONNX SLM → heuristic), per-mode custom AI personas, process-disguise stealth, phone mirror, calendar sync, Codex CLI integration, and a crypto token gating system. The technical ambition is genuine and many implementations are production-quality.

The product is currently positioned as an open-source Cluely clone, which is correct as an acquisition strategy but is the wrong long-term positioning. The real opportunity — which the codebase is already halfway building — is a **career intelligence operating system** that lives locally on the user's machine and becomes the smartest, most private AI memory they have for their professional life.

**Current state: 7/10 engineering, 5/10 product, 4/10 business architecture.**

The biggest risks are not technical — they are strategic, ethical, and scaling-related.

---

## 2. PRODUCT VISION ANALYSIS

### What this actually is
The product is marketed as a "free Cluely clone," but that undersells it dramatically. Under the hood you have: a local knowledge graph of the user's career history (RAG over meetings), real-time multi-modal AI inference, hardware-level audio capture, and a programmable AI persona system. That is a **personal AI knowledge layer for professional life** — far more than a cheating tool.

### The identity problem
The README leads with "The Free, Open-Source Cluely Clone." This is an SEO strategy (and a smart one — 341k views), but it creates a dangerous product identity: you are a cheaper, free version of a product that already admitted ARR fraud and had an 83,000-user data breach. **Being the best clone of a tainted brand is a ceiling, not a north star.**

### The real product thesis
Every professional spends 30–50% of their work life in real-time, high-stakes conversations: job interviews, sales calls, performance reviews, technical design sessions, client meetings, board presentations. Almost none of that intelligence is captured, searchable, or usable afterward. Natively solves this. The real product copy should be: *"The AI that lives on your machine and knows your entire professional life. Private, local, always on."*

### Emotional resonance
The "5-year dream project" energy is visible in the code. The hallucination filter, the anti-AI-tell prompts, the speculative inference pre-warming, the rate limiter queue rejection vs resolution fix — these are the decisions of someone who has *used* the product in real meetings and felt exactly where it hurts. That is a competitive advantage no VC-backed team can replicate.

---

## 3. ARCHITECTURE AUDIT

### What's right
- **Electron + Vite + TypeScript + React**: correct stack for a cross-platform desktop app in 2026
- **Rust native module via napi-rs**: genuinely impressive and correct for audio — no web audio stack can match this for latency
- **IPC-first communication**: strict main/renderer boundary, preload bridge, no direct Node.js in renderer — architecturally clean
- **Singleton service pattern**: `DatabaseManager.getInstance()`, `CredentialsManager.getInstance()`, `SettingsManager.getInstance()` — consistent and correct for Electron
- **Migration versioning**: `PRAGMA user_version` with numbered migration blocks — production-quality
- **WAL mode**: `db.pragma('journal_mode = WAL')` — correct for read-heavy workload with background writer
- **Worker thread isolation**: `vectorSearchWorker.ts` separates heavy cosine math from main thread
- **Speculative inference**: pre-firing LLM on partial transcripts, cancelling on final — genuinely clever

### Critical architectural risks

**1. The 2,910-line `NativelyInterface.tsx` monolith** (documented in `gap-analysis.md` as A1)
This is not a code smell — it is an active performance bomb. Every streaming token fires `setMessages`, which triggers a full re-render of the entire component tree including ReactMarkdown + Prism re-tokenization. At 200–400 tok/s from Groq, this is 200–400 full re-renders per second. The gap analysis has the correct fix (React.memo, rAF coalescing, hoisted components) but it has not shipped. **This is the single highest-priority engineering task in the entire codebase.**

**2. `require()` at runtime for premium modules** (`ipcHandlers.ts:35`, `RAGManager.ts:369`)
```ts
const { LicenseManager } = require('../premium/electron/services/LicenseManager');
```
Dynamic `require()` in hot paths disables V8's static module graph, breaks tree-shaking, and makes stack traces opaque. These should be top-level conditional imports at module load time or lazy-loaded via `import()` with proper caching.

**3. No message queue or job broker**
All background work (embedding, meeting processing, STT reconnection) runs as in-process async calls. There is no persistent job queue. If the app crashes mid-embedding, the meeting's RAG data is silently lost. A durable queue backed by SQLite (already present) — even a simple `embedding_queue` table with a polling loop — would fix this. You already *have* `embedding_queue` in the schema but it is not durably checkpointed on crash.

**4. `AppState` god object in `main.ts`**
The entire application state lives in a single class passed everywhere. As the feature count grows, this becomes untestable and unmaintainable. The correct pattern for Electron is service injection with typed IPC handlers — which you're partway there with the service singleton pattern but haven't completed.

**5. `electron/LLMHelper.ts.orig` committed to repo**
A `.orig` file in version control is a sign of a merge conflict that was never cleaned up. It will confuse contributors and may contain sensitive data.

---

## 4. BACKEND AUDIT

### Services quality
- **SettingsManager**: clean, atomic write via tmp→rename, good
- **CredentialsManager**: uses `safeStorage` (OS keychain) for encryption at rest — excellent
- **RateLimiter**: token-bucket with MAX_QUEUE_DEPTH cap and destroy() reject (not resolve) — well-reasoned
- **ModesManager**: clean separation of template vs custom context, note sections schema is thoughtful
- **SessionTracker**: manages transcript window, context items, suggestion triggers — good domain modeling

### Serious gaps

**1. No input validation on IPC handlers**
`ipcHandlers.ts` receives raw data from the renderer with zero validation. Example: `key: string` in `license:activate` — no type checking, no length limit, no sanitization. A compromised renderer (via XSS in markdown rendering) could send arbitrary data to all handlers.

**2. Missing idempotency on critical operations**
`RAGManager.processMeeting()` has a concurrent call guard (`_reprocessInFlight`) but `DatabaseManager` insert operations are not idempotent by default. If a network drop causes a partial meeting save and the app retries, duplicate transcript rows are possible.

**3. `exec()` / `execAsync()` without shell=false** (`LLMHelper.ts`)
The Codex CLI integration uses `exec()`. If `codexCliConfig.path` or model names contain shell metacharacters, this is command injection. Must use `execFile()` with explicit argv array.

**4. Synchronous file I/O in main process**
`SettingsManager.loadSettings()` and `CredentialsManager.loadCredentials()` use synchronous `fs.readFileSync`. These block the Electron main process event loop during startup. Small files, but the pattern is wrong — should be async.

**5. `electron/verboseLog.ts`**
A one-off verbose logger that is separate from the main `logToFile` system. Two logging systems in the same process create inconsistent log rotation and make debugging harder.

**6. `electron/db/test-db.ts` and `electron/db/seedDemo.ts` in production build**
These are not excluded by the electron-builder config. Debug/seed code ships in production.

---

## 5. FRONTEND + UX AUDIT

### What's genuinely good
- The framer-motion entry animation on the launcher (expo-out, 800ms) is premium quality
- The `AnimatePresence` exit animation on the startup sequence is correctly wired
- Error boundaries are present and scoped by context (SettingsPopup, Overlay, Launcher)
- The `OVERLAY_OPACITY_DEFAULT` / `getDefaultOverlayOpacity()` theme-aware logic is thoughtful
- The ad toaster architecture (`useAdCampaigns`, `RemoteCampaignToaster`) separates targeting logic from render — clean

### Critical UX problems

**1. App.tsx window type detection via URL query params**
```tsx
const isSettingsWindow = new URLSearchParams(window.location.search).get('window') === 'settings';
```
This is fragile. The `App.tsx` file acts as a router for 6 different window types (overlay, launcher, settings, model-selector, mode-selector, cropper) by checking URL params. This means ALL component trees are loaded in ALL windows and conditionally rendered. A settings window is loading framer-motion, RAG components, ad system components, trial banner components — all dead weight. Each window should be a separate entry point in Vite. This is a **cold start latency** issue: the overlay window (most latency-sensitive) is loading the full app bundle.

**2. `react-query` v3 is installed but this is 2026**
`react-query: ^3.39.3` is 3 major versions behind TanStack Query v5. v3's API is deprecated. More critically: this package caused a recent build failure. The codebase should migrate to `@tanstack/react-query` v5 or just remove it — it appears to be used minimally.

**3. localStorage for security-sensitive state**
```tsx
const stored = localStorage.getItem('natively_overlay_opacity');
localStorage.getItem('preferredInputDeviceId');
localStorage.getItem('natively_last_meeting_start');
```
`localStorage` is accessible from any renderer JS, including markdown-rendered content if there is any XSS vector. Device IDs and meeting state should live in IPC-backed state, not localStorage.

**4. The "no UX" onboarding**
A first-time user is dropped into the launcher with a startup sequence animation. There is no guided setup for the most critical step: configuring API keys. The `PermissionsToaster` is shown on first launch, which is good, but the path from "I just installed this" to "I have a working assistant" requires the user to navigate Settings > API tab and paste keys. This is the #1 cause of user drop-off for BYOK tools. A dedicated onboarding wizard with key validation and a "test it now" button would halve setup abandonment.

**5. Ad system in open-source code**
The `useAdCampaigns`, `JDAwarenessToaster`, `PremiumPromoToaster`, `NativelyApiPromoToaster`, `MaxUltraUpgradeToaster`, `RemoteCampaignToaster` — all visible in `App.tsx`. These are promotion mechanisms for the paid tier. Having them in the open-source repo means every user sees them regardless of whether they want them. This creates a trust gap: you market "privacy-first, no tracking" but the app pops up upgrade toasters managed by a remote campaign system.

**6. Missing states**
- No skeleton loading states (flash of empty content)
- No offline indicator when all AI providers fail
- No "meeting transcript is too long, old context was trimmed" notification
- No cost tracker visible during a meeting (you have it post-meeting but not live)

---

## 6. AI/LLM SYSTEMS AUDIT

### What's genuinely world-class
The prompt engineering in `prompts.ts` is among the best in any open-source product:

- **Anti-AI-tell system**: explicitly banning "delve," em-dashes, semicolons in spoken passages, and hedging language — this is the difference between an AI that sounds like a tool and one that sounds like a colleague
- **Accuracy admission templates**: four precise templates for when to say "I don't have that context" — prevents hallucination while maintaining voice
- **Execution contract**: deterministic, one-pass, no meta, length law — a production-quality prompt system
- **Shared prefix deduplication**: `SHARED_MODE_PREFIX` to prevent double-sending 2,000 tokens — showing real cost awareness
- **Three-tier intent classifier**: regex → ONNX MobileBERT → context heuristic — elegant and practical

### Critical AI system risks

**1. Gemini explicit `cachedContent` API not wired (B3 in gap-analysis)**
The `GeminiPromptCache.ts` exists but the `cachedContent` API (which reduces token cost by ~75% on static prompts) has a `// TODO` in `LLMHelper.ts:3146–3151`. Given that the static prompts are 2k+ tokens, this is leaving significant cost savings on the table — particularly important for the hosted Natively API tier where you pay the inference costs.

**2. RAG hard-coded to Gemini for response generation**
```ts
const stream = this.llmHelper.streamChatWithGemini(prompt, undefined, undefined, true);
```
`RAGManager.queryMeeting()` and `queryGlobal()` always call `streamChatWithGemini` regardless of what LLM the user has configured. If a user has only OpenAI configured, RAG queries silently fail or use a fallback that's not obvious to the user.

**3. No prompt versioning or rollback**
The prompts are constants in `prompts.ts`. If a prompt change causes a regression (worse answer quality), there is no way to roll back without a full app release. For a product that ships prompt updates frequently, a versioned prompt store (even a JSON file in `userData`) would enable hotfixes.

**4. Hallucination filter is naive**
`hallucinationFilter.ts` blocks exact strings (`[music]`, `thank you for watching`) and bracket-wrapped tokens. It does not handle the most common Whisper hallucination in meeting contexts: repetitive filler loops ("um um um um um"), cross-contamination from adjacent audio (song lyrics heard from another tab), or phonetic false-positives on technical terms. The filter needs pattern-based repetition detection and a minimum unique-word count check.

**5. No AI evaluation pipeline**
There is no automated way to test whether a prompt change made answers better or worse. The test files (`erp-1hour-real.test.ts`, `erp-mode-stress.test.ts`) are stress tests, not quality evaluations. A set of 50 canonical (question, expected_answer_shape) pairs with an LLM-as-judge scorer would enable confident prompt iteration.

**6. Speculative inference has no quality gate**
`IntelligenceEngine.ts` fires speculative inference on high-confidence partials. If the speculative answer is wildly wrong (because the partial was ambiguous), the user sees a hallucinated answer start to stream before the real question has finished. There is no quality gate on speculative results — they should be held in a buffer and only displayed if the final question matches the speculative trigger with ≥70% string overlap.

**7. `BANNED WORDS` list vs semantic anti-AI-tell**
The banned word list in `prompts.ts` is a good start but brittle. "Leverage" is banned, but "utilize" (equally AI-tell) is not. "Additionally" is banned as a transition, but "Furthermore" is still possible. A semantic post-processor that detects these patterns at inference time would be more robust.

---

## 7. SECURITY AUDIT

### Serious vulnerabilities

**1. Command injection via Codex CLI path** (`LLMHelper.ts`)
The app passes user-configured `codexCliConfig.path` directly to `exec()`. If a user is tricked into setting a malicious path, or if the path is read from an untrusted source, this is arbitrary code execution. Fix: use `execFile()`, validate path is an absolute filesystem path, checksum the binary against a known-good hash.

**2. cURL injection via custom provider**
```ts
const parsed = curl2Json(curlCommand)
```
`CredentialsManager` stores raw cURL commands from user input. These are parsed and executed. A malicious cURL command (via social engineering or a compromised settings file) could exfiltrate API keys by routing to an attacker's server. The `deepVariableReplacer` in `curlUtils.ts` does variable substitution without escaping. Fix: parse and whitelist the curl fields (URL, headers, body template), never pass to shell.

**3. IPC handlers have no origin validation**
`ipcMain.handle()` in `ipcHandlers.ts` does not check `event.senderFrame.url` or validate that the call comes from the expected renderer. A malicious third-party iframe loaded inside the app (e.g., via a vulnerability in `react-markdown`) could invoke any IPC handler including `license:activate`, `profile:upload`, `meeting:delete`.

**4. `ElevenLabsStreamingSTT.ts` raw audio written to disk**
The `~/elevenlabs_debug.raw` write (noted in gap-analysis E4) writes unencrypted raw PCM audio to the user's home directory. If a meeting is confidential (salary negotiation, medical, legal), this is a PII leak on the filesystem, visible to any other app with home directory access.

**5. Trial token stored in plain text alongside an expiry timestamp**
```ts
trialToken?: string;
trialExpiresAt?: string;
```
Both the token and expiry are stored in `credentials.enc`. If the file is copied to another machine, the trial is trivially cloned. The token should be tied to a hardware identifier (HWID), which you do have (`InstallPingManager.ts`) — but the HWID check must happen server-side on every trial call, not just at activation.

**6. No CSP on the Electron renderer**
There is no `Content-Security-Policy` header configured in the `BrowserWindow` `webPreferences`. `nodeIntegration: false` and `contextIsolation: true` are likely set (correct), but without CSP, injected scripts from markdown content could exfiltrate `localStorage` data to external URLs.

**7. `LLMHelper.ts.orig` may contain API keys from a real session**
This file was committed to the repo. If it was created during a merge conflict mid-session, it may contain real API keys embedded in test calls. This needs to be audited immediately and removed with a git history rewrite if keys are present.

---

## 8. DATABASE + INFRASTRUCTURE AUDIT

### What's strong
- Schema versioned with `PRAGMA user_version` migrations — production correct
- Foreign keys with `ON DELETE CASCADE` for transcript/chunk/ai_interaction orphan prevention
- `embedding_queue` table for async background embedding — correct architecture
- sqlite-vec integration for native cosine search (vs JS fallback) — impressive for an Electron app
- `app_state` KV table for boot-persistent state — avoids `electron-store` for critical data

### Gaps

**1. No transaction wrapping on multi-step writes**
`DatabaseManager` does multi-statement operations (insert meeting + insert transcripts + insert ai_interactions) without wrapping in a SQLite transaction. If the app crashes between statements, you get partial meeting records that the RAG pipeline then chokes on.

**2. Missing indexes on hot query paths**
`embedding_queue WHERE status = 'pending'` is queried on every processing cycle but there is no index on `status`. With thousands of meetings, this becomes a full table scan. Add `CREATE INDEX idx_eq_status ON embedding_queue(status)`.

**3. Vector search dimension mismatch handling**
The `reindexIncompatibleMeetings()` method handles provider switches by deleting and re-embedding. But there is a TOCTOU window: if the user switches providers mid-meeting, the live indexer's JIT chunks are indexed with one provider's dimensions while the post-meeting processor uses another. The result is silent retrieval failure with no user notification.

**4. No backup strategy**
`natively.db` is a single file in `userData`. There is no periodic backup, no export reminder, no crash recovery. If the disk fails or the file is corrupted (e.g., mid-write power loss before WAL commit), all meeting history is gone. A daily shadow copy to `natively.db.bak` would take 2 lines of code.

**5. `resume_nodes` embedding stored as BLOB in SQLite (not vec0)**
Resume node embeddings are stored in the `resume_nodes.embedding BLOB` column, not in a `vec0` virtual table. This means resume similarity search falls back to JS cosine, negating the sqlite-vec advantage for the premium profile intelligence feature.

---

## 9. DEVOPS AUDIT

### What exists
- electron-builder with Mac (dmg/zip x64/arm64) + Windows (nsis/portable) + Linux (AppImage/deb)
- GitHub Releases as auto-update provider
- `postinstall` script handles native rebuild + model download + sqlite-vec ensure
- Log rotation at 10MB with single `.log.1` rollover
- `hardenedRuntime: false` and `identity: null` (unsigned for now)

### Critical gaps

**1. No CI/CD pipeline**
There is no `.github/workflows/` directory. Releases are built and pushed manually. This means:
- No automated test runs before release
- No reproducible builds (dev environment drift)
- No automated code signing
- No release artifact integrity verification

**2. `hardenedRuntime: false`**
macOS hardenedRuntime is disabled. This means the app cannot be notarized by Apple. On macOS 13+, non-notarized apps trigger Gatekeeper "App is Damaged" dialogs (the README documents the workaround: `xattr -cr`). This is a massive onboarding friction point. For a tool positioning itself as trustworthy vs Cluely's breach, being unable to pass Apple's own security check is a reputational problem.

**3. No error reporting / crash analytics**
There is no Sentry, Bugsnag, or equivalent. The only crash data is the local `natively_debug.log`. If 9,000 users are all seeing the same crash, there is no way to know. GA4 tracks `app_open` / `meeting_started` but not errors.

**4. No canary / staging channel**
All releases go directly to the production `latest.yml` auto-updater. There is no `beta` channel (despite the current branch being named `beta`). High-impact issues discovered post-release hit all 9,000 users simultaneously.

---

## 10. ENTERPRISE READINESS SCORE: 2/10

| Dimension | Score | Notes |
|---|---|---|
| SSO / SAML | 0/10 | Not present |
| SCIM provisioning | 0/10 | Not present |
| Audit logs | 2/10 | Local file logging only |
| Role management | 1/10 | Binary free/pro only |
| Admin dashboard | 0/10 | Not present |
| SLA readiness | 0/10 | No uptime monitoring |
| Billing / invoicing | 3/10 | Dodo Payments exists but no enterprise invoicing |
| API surface | 1/10 | Internal IPC only, no external API |
| Webhooks | 0/10 | Not present |
| Compliance (SOC2/GDPR) | 2/10 | Privacy-by-design helps but no formal program |

**Honest verdict**: This is a consumer product, not an enterprise product. That is fine for the current stage, but the "Natively API" positioning and enterprise pricing tier ($35/month Ultra) imply enterprise readiness that doesn't exist. Do not sell to enterprise buyers with SOC2 requirements until the audit log and access control infrastructure is in place.

---

## 11. SCALABILITY READINESS SCORE: 6/10

### At 1,000 users (current)
The product works. SQLite is local so there is no backend scale. The Natively API tier is a thin proxy — its scalability depends entirely on upstream provider rate limits.

### At 10,000 users
**First breaks:**
- Natively API tier: if 10,000 users each make 100 AI calls/day, that's 1M calls/day routed through what appears to be a simple proxy. No queue, no circuit breaker, no per-user rate limiting visible in the open-source code.
- GitHub Releases auto-updater: 10,000 clients polling GitHub at startup will hit rate limits. electron-updater has no exponential backoff by default.

### At 100,000 users
**Catastrophic breaks:**
- The `InstallPingManager.ts` / GA4 install ping infrastructure was not designed for 100k simultaneous DAU.
- If the Natively Pro license server (DodoPay webhooks) has any state management bugs, 100k activation/deactivation events per day will expose them.
- The local SQLite approach means support is handling `natively.db` corruption issues across 100k users with no telemetry to diagnose.

### At 1,000,000 users
**Structural breaks:**
- The Natively API tier is not separable from the desktop app business — the two monetization models share code, credentials, and billing without clear domain boundaries.
- The free BYOK model means API key leakage (users sharing configs) scales with user count. At 1M users, shared keys will be detected and revoked en masse by upstream providers.

---

## 12. AI MATURITY SCORE: 7/10

| Dimension | Score | Notes |
|---|---|---|
| Prompt quality | 9/10 | Best-in-class anti-AI-tell system |
| Context engineering | 7/10 | Rolling window, mode prefix dedup — good |
| RAG architecture | 8/10 | Local JIT + post-meeting, live indexing — impressive |
| Intent classification | 8/10 | 3-tier regex+ONNX+heuristic — well-engineered |
| Hallucination prevention | 5/10 | Good admission templates, weak whisper filter |
| Multi-model routing | 5/10 | Waterfall, not per-intent — gap documented |
| AI cost optimization | 4/10 | Gemini cache TODO, OpenAI cache_key missing |
| AI evaluation pipeline | 1/10 | No quality regression testing |
| AI observability | 3/10 | Local log only, no aggregated quality metrics |
| Speculative inference | 8/10 | Genuinely innovative |

---

## 13. UX MATURITY SCORE: 5/10

| Dimension | Score | Notes |
|---|---|---|
| First-run experience | 3/10 | Startup animation is beautiful, key setup is painful |
| Core meeting experience | 7/10 | Fast when it works, re-render storm when busy |
| Visual design quality | 8/10 | Dark premium aesthetic, good motion design |
| Information architecture | 4/10 | 2,910-line monolith is symptom of IA confusion |
| Accessibility | 2/10 | No ARIA, no keyboard nav audit visible |
| Error states | 4/10 | Some toasters, but missing critical failure states |
| Cognitive load | 5/10 | Too many modes, providers, settings without progressive disclosure |
| Delight moments | 7/10 | Startup sequence, animations, process disguise |
| Mobile experience | 0/10 | Desktop-only |
| AI result presentation | 5/10 | Prose blocks, no SAY FIRST glance format |

---

## 14. TECHNICAL DEBT ANALYSIS

**Critical (ship-blocking):**
1. `NativelyInterface.tsx` 2,910-line monolith with streaming re-render storm — documented in gap-analysis A1
2. `LLMHelper.ts` 3000+ lines with all provider implementations in one class — impossible to test independently
3. Dynamic `require()` calls in hot IPC paths
4. No transaction wrapping on multi-step DB writes

**High (next sprint):**
1. `react-query` v3 → `@tanstack/react-query` v5 migration
2. `LLMHelper.ts.orig` in repo — clean up immediately
3. `test-db.ts` and `seedDemo.ts` shipped in production build
4. `ElevenLabsStreamingSTT` raw audio disk write without production guard
5. Unbounded STT reconnect loops (3 providers affected)

**Medium (this quarter):**
1. URL param-based window routing → Vite multi-page or separate entry points
2. `exec()` → `execFile()` for Codex CLI
3. Missing indexes on `embedding_queue.status`
4. No database backup strategy
5. `resume_nodes` embeddings not in vec0

**Low (backlog):**
1. Verbose logger duplication
2. `MeetingPersistence` direct broadcast → `_broadcastToAllWindows`

---

## 15. HIDDEN RISKS

**1. The ethics sword of Damocles**
The product's stealth mode, process disguise, and "interview cheating" marketing create a reputational risk that will surface when the user base grows. Universities and employers are actively building detection. Talview already names Cluely and Parakeet by name. When Natively crosses 50k users, it will be named too. The open-source AGPL-3.0 license makes this harder to litigate against, but the marketing copy explicitly describes circumventing proctoring software. This is a legal and reputational risk that needs a strategy — not avoidance, but a deliberate positioning statement.

**2. The Cluely comparison as a liability**
The README's 83,000-user breach marketing against Cluely is currently an asset. But if Cluely fixes its security and grows to 500k users while Natively stays at 50k, the comparison flips. The product needs its own identity that doesn't require Cluely to be bad.

**3. The AGPL compliance gap**
The product is AGPL-3.0 but has a closed-source `premium/` submodule. The AGPL requires that modifications to the licensed code be made available. The premium features are built on top of the AGPL core. Legal review needed: does distributing a binary that includes both AGPL code and proprietary premium code require releasing the premium code? If the answer is "yes," the entire business model is at risk.

**4. API key trust model**
BYOK means the app holds the user's API keys (Gemini, OpenAI, Claude, Deepgram, etc.) in OS keychain. If there is any code execution path that can exfiltrate credentials (Codex CLI + `exec()` injection being the most obvious), a malicious meeting participant who can influence the transcript could trigger key exfiltration.

**5. The crypto token (`$NAT`) integration**
The README mentions `$NAT` token on Printr for unlocking Pro features. This adds regulatory exposure (unlicensed securities in some jurisdictions), smart contract risk (if the on-chain logic has bugs, Pro features become inaccessible), and reputational risk (if `$NAT` pumps and dumps, it associates the product with speculation). This needs a legal review before it's prominently featured.

---

## 16. CRITICAL MISSING FEATURES

**1. SAY FIRST output format** (gap-analysis C1 — highest UX priority)
Every competitor that's been adopted in real interviews uses a glance-first format: a short opener the user can speak while reading the full answer. Natively generates prose blocks. Fix: add `SAY FIRST: <≤8-word opener>` to `EXECUTION_CONTRACT` in `prompts.ts`.

**2. Pre-warmed STT connections** (gap-analysis A3)
First words of every meeting are potentially lost because STT WebSocket handshake happens at meeting start, not at app start. Fix in `main.ts`: pre-warm STT connections at app launch when credentials are present.

**3. Per-intent model routing** (gap-analysis C3)
Coding questions should route to the strongest reasoner (Claude Sonnet, GPT-5.4). Behavioral questions should route to the fastest (Gemini Flash). Currently the user picks one model for the entire session.

**4. Structured CI/CD**
No automated builds, no automated tests in CI. First for a project with 9,000 users is a release that breaks the app for all 9,000 simultaneously.

**5. Onboarding wizard**
New users need a 5-step guided setup: (1) permissions, (2) STT provider + key validation, (3) AI provider + key validation, (4) test recording, (5) optional Ollama setup. Currently there is just a toaster and a settings panel.

**6. Cost dashboard during meetings**
Users want to know how much they're spending in real time, not just post-meeting. A token counter in the overlay (with live cost estimate per provider) would make BYOK users more comfortable with intensive use.

**7. Keyboard-first overlay navigation**
The overlay is used during meetings where the user cannot use the mouse without looking away. Tab/arrow navigation through suggested answers, keyboard shortcut to copy-to-clipboard, keyboard shortcut to accept/reject speculative answer — none of these appear to be implemented.

---

## 17. PREMIUM FEATURE OPPORTUNITIES

**The following are genuinely category-creating features that nobody in the space has:**

**1. Career Memory Graph**
Every meeting, interview, and conversation is currently a disconnected transcript. Build a knowledge graph: entities (companies, people, technologies, projects) → relationships → timeline. "What did Sarah from Stripe say about their API migration in our March call?" should work in under 500ms from local SQLite. The RAG infrastructure is 80% of the way there — the missing piece is entity extraction at index time and graph traversal at query time.

**2. Pre-meeting Intelligence Brief**
Calendar integration already exists. 15 minutes before a meeting, automatically generate: (1) who the participants are from past meetings, (2) what was last discussed with them, (3) what was promised and not yet delivered, (4) talking points based on the meeting agenda. No competitor has this. It requires the RAG + calendar + LLM pipeline that you've already built independently.

**3. Real-time Confidence Coaching**
Beyond just answering questions: track when the user's voice (via mic STT) goes quiet for too long, detects filler words ("um", "uh", "like"), measures response length vs question complexity. Surface micro-coaching: "Your answer was 40 seconds for a yes/no question — aim for 15 seconds." LockedIn has a post-interview version. Nobody does it in real-time.

**4. Offer Negotiation Simulator**
The salary negotiation copilot already exists (referenced in feature list). But the premium version should be: load the job description, load the candidate's market rate from public salary data, load the company's funding stage and headcount from Crunchbase, and generate a step-by-step negotiation strategy with real-time coaching as the offer conversation happens.

**5. Automated Follow-up Intelligence**
After a meeting, automatically draft personalized follow-up emails (per participant) based on what was discussed, what was promised, and what the relationship history shows. Integrate with Gmail/Outlook via the existing calendar auth flow. The meeting is already in the DB; the relationship graph (once built) provides the personalization layer.

**6. Multi-session Performance Analytics**
"How do my technical answers compare between my interview with Stripe vs my interview with Robinhood?" Longitudinal analysis across meeting sessions: response quality trend, topic gaps, repeated mistakes. This creates the emotional stickiness that makes users stay — the product becomes a career coach that improves over time.

**7. Silent Real-time Translation**
For non-native English speakers, translate the AI's suggested answers into their native language in real-time (speech synthesis via ElevenLabs is already available). Then translate their spoken response back to English for the transcript. The entire STT/LLM/TTS pipeline is in place — this is an integration, not a new capability.

**8. Team Intelligence Mode** (Enterprise unlock)
When multiple people at the same company use Natively, opt-in shared meeting memory: "What did the Acme account team learn about their Q3 priorities last month?" This creates network effects — each user's meetings improve the intelligence of the whole team. This is a moat no individual user can get elsewhere.

---

## 18. COMPETITIVE ADVANTAGE ANALYSIS

### Genuine moats (hard to replicate)
1. **Rust audio module**: ~18 months of native macOS audio engineering. Not reproducible by an intern spinning up a competitor. The Zero-Copy ABI via `napi::Buffer` is genuinely innovative.
2. **Local RAG with sqlite-vec**: every competitor stores meeting data server-side. Natively's local-first architecture is a moat because it is an architectural commitment, not a feature — you can't add "local" to a cloud architecture.
3. **AGPL-3.0 trust layer**: in a post-Cluely-breach world, the ability to say "our entire codebase is on GitHub, reviewed by thousands of security researchers, and requires our own source to remain open" is a genuine trust moat.
4. **7-mode AI persona system with reference file injection**: more granular than any competitor's template system.
5. **8 STT provider support**: the only product in the space that is transparent about its STT stack.

### Competitive gaps
1. **No click-through pass-through**: Verve's `Cmd+Shift+P` is a genuine UX win. Documented in gap-analysis D3.
2. **No glance-first SAY FIRST format**: the single biggest output UX gap vs Cluely/Final Round.
3. **No IDE integration**: LockedIn's VSCode/Cursor integration is used by technical interviewees who want to type while seeing the answer.
4. **No mock interview mode**: Final Round's core positioning. Natively focuses on live but misses the prep market entirely.

---

## 19. INVESTOR PERSPECTIVE

A YC partner or a16z associate reviewing this would ask:

**Positive signals:**
- 9,000 users, 700 DAU, 341k GitHub views — real organic traction with zero paid acquisition
- Technical depth (Rust module, ONNX, local RAG) is evidence of defensibility
- AGPL open-source creates community contributions and free marketing
- Revenue exists: Dodo Payments for Pro + API subscriptions, $8–$35/month tiers

**Serious concerns:**
- **The cheating positioning**: An investor will ask "what happens when this gets banned from all coding interview platforms?" The answer needs to be the broader career intelligence vision, not "we'll keep making the stealth better."
- **No moat on the core product** outside the Rust module: the LLM calls, RAG architecture, and UI can be replicated. The trust/open-source moat is real but not quantifiable.
- **No revenue disclosure** in public channels. The "9,000 users, 700 DAU" numbers are impressive but conversion rate to paid is unknown.
- **The $NAT token**: this will make every institutional investor walk out. Crypto-gated feature access is incompatible with standard SaaS valuation models.
- **Single maintainer risk**: `evinjohnn@gmail.com` is the author. What happens if the maintainer burns out?

**If pitching at YC:**
Frame it as: *"Personal AI memory for professional life — local, private, owned by the user. 9,000 users in 6 months with no paid acquisition. Our moat is the local-first architecture in a category where the incumbent just had an 83,000-user data breach."* Drop the cheating framing entirely in the pitch deck.

---

## 20. CTO RECOMMENDATIONS

**Week 1 (fire drills):**
1. Fix the `NativelyInterface.tsx` re-render storm — `React.memo` on `MessageRow`, rAF-coalesce `setMessages`. This is the #1 user-visible performance bug.
2. Remove `electron/LLMHelper.ts.orig` from git history. Audit it first for embedded API keys.
3. Add `if (!app.isPackaged)` guard to `ElevenLabsStreamingSTT` raw audio write.
4. Wrap multi-statement DB writes in transactions.

**Month 1 (structural):**
5. Add `SAY FIRST:` format to `EXECUTION_CONTRACT` — closes the biggest output UX gap vs Cluely.
6. Wire Gemini `cachedContent` API — B3 in gap-analysis — cuts Gemini costs by ~75% on cache-hit paths.
7. Replace `exec()` with `execFile()` for Codex CLI, add path validation.
8. Cap unbounded STT reconnect loops (E1 in gap-analysis).
9. Pre-warm STT WebSocket connections at app launch (A3).
10. Add `CREATE INDEX idx_eq_status ON embedding_queue(status)`.

**Quarter 1 (platform):**
11. Set up GitHub Actions CI: lint, typecheck, unit tests, electron-builder dry-run on every PR.
12. Enable `hardenedRuntime: true` and set up notarization via `@electron/notarize` — removes the "App is Damaged" barrier for every new user.
13. Migrate from `react-query` v3 to `@tanstack/react-query` v5.
14. Separate `NativelyInterface.tsx` into domain components: `TranscriptPanel`, `SuggestedAnswerPanel`, `MeetingControls`.
15. Build the onboarding wizard.
16. Add IPC origin validation to all handlers.

---

## 21. 12-MONTH ENTERPRISE ROADMAP

| Quarter | Theme | Key Deliverables |
|---|---|---|
| Q1 | **Stability + Trust** | CI/CD, notarization, render performance fix, SAY FIRST format, security hardening |
| Q2 | **Intelligence Leap** | Career memory graph, pre-meeting intelligence brief, per-intent model routing, Gemini cache |
| Q3 | **Platform** | Team mode (multi-user shared memory), IDE integration (VSCode extension), API surface for third-party integrations |
| Q4 | **Enterprise** | SSO, audit logs, admin dashboard, SOC2 readiness program, enterprise billing |

---

## 22. 3-YEAR VISION ARCHITECTURE

**Year 1: Personal AI memory for professional life**
The product is the smartest local assistant a professional can have. It knows every meeting, every promise, every technical conversation, every career milestone. It runs 100% locally. It's the anti-Notion: instead of manually capturing, it captures automatically.

**Year 2: Networked intelligence** (opt-in, privacy-preserving)
Teams opt in to share meeting intelligence. A new sales rep joins a company and immediately has access to everything the team learned about every account over the past 3 years — with full privacy controls. This is the network effect moat. No individual-first privacy tool has done this before.

**Year 3: Career operating system**
The product graduates from meetings to all professional communication: emails, Slack, code reviews, performance reviews, salary negotiations. The AI knows your entire professional context and helps you communicate better in every medium. The local-first architecture is the foundation that makes this trustworthy at scale.

**Technical architecture for Year 3:**
- Local knowledge graph database (beyond SQLite — DuckDB or SQLite FTS5 hybrid)
- On-device embedding model upgrade (BGE-small or nomic-embed)
- Agentic workflow engine for pre-meeting research and post-meeting follow-up
- Cross-device sync via end-to-end encrypted sync (similar to Obsidian Sync model)
- Plugin system for third-party integrations (Jira, Salesforce, GitHub)

---

## 23. IF I WERE CTO, I WOULD DO THIS NEXT

**In order of impact-to-effort:**

1. **Ship the `NativelyInterface.tsx` performance fix today.** Every meeting demo you do right now is potentially showing a stuttering stream at 60% CPU. This is the difference between "wow" and "hmm."

2. **Add `SAY FIRST:` to `EXECUTION_CONTRACT` this week.** One line of code. Every answer the product generates immediately looks and feels more like what a live interview copilot should produce. This is your #1 UX differentiator gap.

3. **Change the product positioning in the README.** Keep the SEO tags (smart), but the hero copy should be: *"The AI that lives on your machine and knows your entire professional life."* The Cluely comparison belongs in a comparison table, not the headline. You are building something bigger than a Cluely clone and your marketing should reflect that.

4. **Wire the Gemini `cachedContent` API.** You're paying 4x the token cost on every cloud LLM request because the `// TODO` on explicit caching has never shipped. For the Natively API tier, this is real money.

5. **Build the career memory graph.** The local RAG is the technical foundation. Entity extraction (people, companies, technologies, decisions) at index time and graph traversal at query time is the feature that will create emotional addiction. "Ask Natively what you agreed to do for Sarah's team in March" — no competitor can answer that because no competitor stores your data locally.

6. **Remove the $NAT token gating from the README.** This is hurting your credibility with technical users and investors more than it's helping with the crypto audience.

7. **File for legal review of AGPL compliance for the premium/ submodule.** If you ever raise a proper funding round, investors will ask. Better to know the answer now.

---

## 24. FINAL BRUTALLY HONEST VERDICT

**The good:** This is one of the most technically ambitious open-source desktop applications from a solo/small team. The Rust audio module alone would be impressive. The combination of Rust + ONNX intent classification + local sqlite-vec RAG + 8 STT providers + 6 LLM providers + speculative inference + anti-AI-tell prompt system is extraordinary. The founder has eaten their own dog food — every design decision shows someone who has used this in real high-stakes meetings and iterated on what hurt. That is a competitive advantage no VC-backed team can replicate.

**The bad:** The product is currently marketed as a cheating tool for a brand (Cluely) that is collapsing under its own weight. This ceiling will be reached sooner than you think. The re-render storm in the overlay means the product feels slow exactly when it matters most — during a live answer. The IPC security model has real vulnerabilities that will be exploited when the product becomes more prominent. The $NAT crypto integration is a serious mistake.

**The ugly:** The gap between what this product actually *is* (a genuinely powerful local AI career intelligence system) and how it's positioned (a free Cluely clone) is the single biggest waste in the product. The moat is real: local-first, AGPL, Rust audio, multi-provider, open codebase. These advantages are being spent acquiring users who want to cheat on LeetCode rather than users who want the AI memory layer for their career. The latter market is 100x larger and far more defensible.

**The verdict:** Ship the performance fix, change the product positioning, wire the Gemini cache, build the career memory graph. This product has the technical bones to be genuinely category-defining. It just needs to stop competing in the category Cluely created and start building the category it should own.

**Rating: 7.5/10 technical, 4/10 strategic direction, 8/10 founder conviction.**

The conviction is the most important ingredient. The strategy just needs to catch up to the code.
