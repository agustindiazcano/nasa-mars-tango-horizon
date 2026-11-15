# 18. Persistent Chat & Voice Session History (Future)

> **Status:** Implementation plan only (not implemented yet).

## 1. Current State

- `MissionStore.transcripts` in `web/src/state.ts` stores `TranscriptLine` items (`{ who, text, final, ts }`) only in browser RAM.
- `server/` (`POST /api/agent/voice`, `POST /api/agent/run`) is stateless; Cloud Run runs `tangohorizon-api` with `--min-instances 1 --max-instances 1` and stores no chat database.
- Reloading the page or switching simulation scenarios clears the visible comms transcript.

---

## 2. Architecture Choice: Client-First Storage + Optional Server Sync

1. **Primary store (Client-side `IndexedDB` with `localStorage` fallback):**
   - Keeps `server/` stateless, adds zero network latency during EVA ops, and works when `AGENTS_OFFLINE=1` or offline.
   - Fits the project rule that the browser is the single source of truth for mission session state.
2. **Compatibility with `17_MULTITURN_VOICE_MEMORY.md`:**
   - Local storage keeps the full display transcript (`SavedChatSession`).
   - When the user resumes a saved session, only the last `<= 6` finalized `you`/`base` entries (trimmed to `400` chars each, matching the active `lang`) are loaded into `VoiceController`'s in-memory `history` buffer.
   - Local `<5 ms` intents, offline replies, and interim ASR partials are excluded from LLM `history`.
3. **Fresh telemetry & `GUARDIAN` invariants:**
   - Restoring a saved session restores chat history **for display and linguistic coreference only**.
   - Every new request still sends fresh `MissionStore.toContext()` telemetry (`suit`, `env`, `fleet`, `astronaut` coordinates).
   - `GUARDIAN` (`ruleCheck` + `judge`) never reads stored sessions or `history` to authorize physical actions.
4. **Optional cross-device sync (post-hackathon):**
   - If desktop HUD and mobile `remote.html` must share saved logs across devices, add an opt-in `/api/sessions` store backed by Firestore on `nasa-tango-horizon` keyed by session owner ID, keeping `GUARDIAN` isolated.

---

## 3. Data Schema (`sessionStore.ts`)

```ts
export interface SavedTranscriptEntry {
  id: string;
  who: "you" | "base" | "system";
  text: string;
  ts: number;
  metS: number;
  route?: string[];
  latencyMs?: number;
}

export interface SavedChatSession {
  id: string;
  title: string;
  lang: "en" | "es";
  scenario: "none" | "storm" | "sep2017" | "leak";
  createdAt: number;
  updatedAt: number;
  entries: SavedTranscriptEntry[];
}
```

- **Storage key / DB:** IndexedDB database `tango-horizon-sessions` (object store `sessions`, index on `updatedAt`), falling back to `localStorage` key `th_chat_sessions_v1` if IndexedDB is unavailable.
- **Bounds:** Maximum `20` saved sessions and `200` finalized entries per session; evict the oldest session by `updatedAt` before writing when the cap is reached.

---

## 4. Lifecycle & UI Controls

1. **Auto-save:** Create or update the active `SavedChatSession` whenever a finalized `TranscriptLine` (`final === true`) is appended. Auto-generate `title` from the active scenario and first finalized user command (truncated to 48 chars).
2. **Comms / Transcript panel controls:**
   - **New session:** Archive current session, clear visible transcript and LLM `history`, start a fresh session ID.
   - **Session picker:** List saved sessions ordered by `updatedAt` (showing date, scenario badge, language, entry count) with load and delete actions.
   - **Export:** Download the active session as `.json` (including `route`, `latencyMs`, `metS`) or `.md` for mission debrief.
3. **Simulation reset vs. Language change:**
   - Simulation reset (`reset()`) creates a new session without deleting prior saved sessions.
   - Switching UI language updates `lang` for new turns; if an older session in a different language is viewed, display its entries without populating LLM `history`.

---

## 5. Tests & Acceptance Criteria

1. Reloading the browser restores the last active `SavedChatSession` transcript entries, timestamps, `route`, and `latencyMs`.
2. Creating a new session or resetting simulation preserves previous sessions in storage.
3. Resuming a saved session passes at most `6` valid `{ role, content }` turns to `/api/agent/voice` (when `B17` is implemented) alongside live `MissionContext`.
4. Exceeding `20` sessions evicts the oldest entry without throwing `QuotaExceededError`.
5. `GUARDIAN` still rejects unsafe commands regardless of prior messages stored in the resumed session.
