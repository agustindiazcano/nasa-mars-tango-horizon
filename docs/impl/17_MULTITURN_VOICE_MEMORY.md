# 17. Bounded Multi-Turn Conversational Memory for Voice Orders (Future)

> **Status:** Implementation plan only (not implemented yet).

## 1. Current Behavior

- `POST /api/agent/voice` in `server/src/agents/routes.ts` validates `VoiceBody` with `{ text, lang, context }` and calls `handleVoice(b.data.text, ctx)`.
- `runAgent` in `server/src/agents/runAgent.ts` initializes `messages` from scratch per request (`[system, { role: "user", content: input }]`).
- Each voice order sees current `MissionContext` telemetry and runs multi-step tool/delegation loops within that single order, but has no memory of prior voice turns (e.g., *"Where is rover-2?"* followed by *"Send it to my position"*).

---

## 2. Schema & Validation (`server/src/agents/types.ts`, `routes.ts`)

Add a bounded optional `history` field to `VoiceBody`:

```ts
export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}
```

Zod validation in `routes.ts`:

```ts
const ConversationTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(400),
});

const VoiceBody = z.object({
  text: z.string().trim().min(1).max(400),
  lang: LangInput,
  context: z.any(),
  history: z.array(ConversationTurnSchema).max(6).optional(),
});
```

- Maximum 6 entries (3 user/assistant pairs), max 400 chars per turn.
- Roles `"system"` and `"tool"` are rejected with HTTP 400.

---

## 3. Security, Telemetry Freshness & Escalation Rules

- **GUARDIAN Isolation:** `history` is never passed to `ruleCheck(action, ctx)` or `judge(...)`. `judge` receives only the current turn's `text` as `crew_request`; prior assistant claims in `history` cannot waive physical limits or inject tool authorizations.
- **Telemetry Freshness:** `history` is used only for linguistic coreference (resolving entities/locations mentioned previously). All physical telemetry and coordinates must still be read from live MCP tools over current `MissionContext`.
- **Internal Escalation Token Isolation:** `SUIT.VOICE-EXEC` and `BASE` receive `history`, while the internal `ESCALATE` token is excluded from client-facing `history`.
- **Delegation Isolation:** Specialist subagents (`SUIT.HEALTH`, `EVA-PLANNER`, `SCIENCE`, `WEATHER-RAD`, `MAINTENANCE`, `ROBOT.<id>`) receive only `BASE`'s focused `objective` string, not the raw `history` buffer.

---

## 4. Client State (`web/src/voice/voiceController.ts` & `web/` Contract)

- Maintain an in-memory rolling buffer (`max 6` entries) in `VoiceController`:
  - Append `{ role: "user", content: clean }` and `{ role: "assistant", content: reply }` only when `/api/agent/voice` succeeds with HTTP 200 and non-empty `speech`.
  - Exclude $<5\text{ ms}$ local critical intents, `repeat` replays, and failed/offline fallback replies.
  - Clear `history` on language switch (`onLangChange`) and simulation/scenario reset (`store.reset()`).

---

## 5. Tests & Acceptance Criteria (`server/src/agents/__tests__/history.test.ts`)

1. Zod rejects `history.length > 6`, `role: "system" | "tool"`, empty content, or `content.length > 400` with HTTP 400.
2. Follow-up coreference (*"Where is rover-2?"* → *"Dispatch it to my position"*) resolves `unit_id: "rover-2"`.
3. Cross-turn prompt injection in `history` cannot bypass `GUARDIAN.ruleCheck` or `GUARDIAN.judge`.
4. Updated `MissionContext` values override stale numbers mentioned in `history` via live MCP tool calls.
5. `ESCALATE` never leaks into `speech` or client `history`.
