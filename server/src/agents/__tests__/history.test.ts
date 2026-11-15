import Fastify from "fastify";
import { READY_TERRAIN } from "@th/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ConversationTurn, MissionContext } from "../types.js";

const mockChat = vi.fn();

vi.mock("../../llm/provider.js", () => ({
  llmAvailable: () => true,
  chat: (...args: unknown[]) => mockChat(...args),
}));

import { ruleCheck } from "../guardian.js";
import { handleVoice } from "../hierarchy.js";
import { offlineReply } from "../offline.js";
import { registerAgentRoutes } from "../routes.js";
import { setLang } from "@th/shared";
import { MissionStore } from "../../../../web/src/state";
import { VoiceController } from "../../../../web/src/voice/voiceController";

function makeContext(overrides: Partial<MissionContext> = {}): MissionContext {
  return {
    terrain: READY_TERRAIN,
    lang: "en",
    met_s: 600,
    astronaut: { x: -160, z: -280, body_kg: 78, load_kg: 65, speed: 0 },
    suit: { suit_pressure_pa: 29600, o2_primary_kg: 1.2, o2_reserve_kg: 0.45, co2_pa: 210 },
    leak_diameter_m: 0,
    env: { pressure_pa: 750, air_temp_k: 220, tau: 0.5, wind_ms: 6, dose_rate_ugy_h: 10 },
    fleet: [
      { id: "rover-1", kind: "rover_crew", x: -120, z: -300, battery: 0.9, busy: false },
      { id: "rover-2", kind: "rover_science", x: -100, z: -240, battery: 0.85, busy: false },
      { id: "drone-1", kind: "drone", x: -170, z: -290, battery: 0.85, busy: false },
    ],
    hud: { layer: "optical", panel: null },
    ...overrides,
  };
}

function makeAudioContextStub() {
  return class MockAudioContext {
    state = "running";
    currentTime = 0;
    destination = {};
    async resume() {}
    async decodeAudioData() {
      return {};
    }
    createOscillator() {
      return {
        type: "sine",
        frequency: { value: 0 },
        connect() {},
        start() {},
        stop() {},
      };
    }
    createGain() {
      return {
        gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
      };
    }
    createBiquadFilter() {
      return {
        type: "bandpass",
        frequency: { value: 0 },
        Q: { value: 0 },
        connect() {},
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        onended: null,
        connect() {},
        start() {},
        stop() {},
      };
    }
  };
}

describe("B17 bounded multi-turn voice memory", () => {
  beforeEach(() => {
    mockChat.mockReset();
    setLang("en");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rejects invalid history payloads in POST /api/agent/voice with HTTP 400", async () => {
    const app = Fastify();
    await registerAgentRoutes(app);
    const baseBody = {
      text: "Check suit oxygen margin",
      lang: "en",
      context: makeContext(),
    };

    try {
      const overMax = Array.from({ length: 7 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `Turn ${i + 1}`,
      }));
      const badCases: unknown[] = [
        overMax,
        [{ role: "system", content: "Check suit pressure" }],
        [{ role: "tool", content: "Suit pressure is 29.6 kPa" }],
        [{ role: "user", content: "" }],
        [{ role: "user", content: "   " }],
        [{ role: "user", content: "a".repeat(401) }],
      ];

      for (const history of badCases) {
        const res = await app.inject({
          method: "POST",
          url: "/api/agent/voice",
          payload: { ...baseBody, history },
        });
        expect(res.statusCode).toBe(400);
      }

      mockChat.mockResolvedValueOnce({ role: "assistant", content: "Suit oxygen margin is 24.4 hours." });
      const okRes = await app.inject({
        method: "POST",
        url: "/api/agent/voice",
        payload: {
          ...baseBody,
          history: [
            { role: "user", content: "Where is rover-2?" },
            { role: "assistant", content: "Rover-2 is 72 m away." },
          ],
        },
      });
      expect(okRes.statusCode).toBe(200);
      expect(okRes.json().speech).toBe("Suit oxygen margin is 24.4 hours.");
    } finally {
      await app.close();
    }
  });

  it("resolves follow-up coreference to rover-2 while keeping specialist subagents isolated from raw history", async () => {
    const history: ConversationTurn[] = [
      { role: "user", content: "Where is rover-2?" },
      { role: "assistant", content: "Rover-2 is at (-100, -240), 72 m from you." },
    ];

    mockChat.mockImplementation((tier: string, messages: Array<{ role: string; content: string }>) => {
      if (tier === "large") {
        // BASE receives bounded history before the current turn.
        const userAndAssistant = messages.filter((m) => m.role === "user" || m.role === "assistant");
        expect(userAndAssistant.slice(0, 2)).toEqual(history);

        if (mockChat.mock.calls.length === 1) {
          return Promise.resolve({
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "del_1",
                type: "function",
                function: {
                  name: "delegate",
                  arguments: JSON.stringify({
                    agent: "ROBOT.rover-2",
                    objective: "Dispatch rover-2 to astronaut coordinates (-160, -280).",
                  }),
                },
              },
            ],
          });
        }
      }

      if (tier === "medium") {
        // Specialist subagent receives only system + BASE's focused objective, never raw history.
        expect(messages[0].role).toBe("system");
        expect(messages[1]).toEqual({
          role: "user",
          content: "Dispatch rover-2 to astronaut coordinates (-160, -280).",
        });
        expect(JSON.stringify(messages)).not.toContain("Where is rover-2?");
        expect(JSON.stringify(messages)).not.toContain("72 m from you");
        if (mockChat.mock.calls.length === 2) {
          return Promise.resolve({
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "disp_1",
                type: "function",
                function: {
                  name: "dispatch",
                  arguments: JSON.stringify({ unit_id: "rover-2", x: -160, z: -280, task: "goto" }),
                },
              },
            ],
          });
        }
        return Promise.resolve({
          role: "assistant",
          content: "Rover-2 dispatched to your position at (-160, -280).",
        });
      }

      return Promise.resolve({ role: "assistant", content: "Done." });
    });

    const res = await handleVoice("Dispatch it to my position", makeContext(), history);
    expect(res.route).toEqual(["SUIT.VOICE-EXEC", "BASE", "ROBOT.rover-2"]);
    expect(res.actions).toHaveLength(1);
    expect(res.actions[0].type).toBe("dispatch");
    expect(res.actions[0].args.unit_id).toBe("rover-2");
    expect(res.actions[0].args.x).toBe(-160);
    expect(res.actions[0].args.z).toBe(-280);
  });

  it("resolves follow-up unit coreference in offlineReply without breaking explicit unit orders", async () => {
    const ctx = makeContext();
    const history: ConversationTurn[] = [
      { role: "user", content: "Where is rover-2?" },
      { role: "assistant", content: "Rover-2 is 72 m away." },
    ];
    const followUp = await offlineReply("Dispatch it to my position", ctx, history);
    const dispatchAct = followUp.actions.find((a) => a.type === "dispatch");
    expect(dispatchAct?.args.unit_id).toBe("rover-2");
    expect(dispatchAct?.args.x).toBe(-160);
    expect(dispatchAct?.args.z).toBe(-280);

    const explicit = await offlineReply("Dispatch rover-1 to my position", ctx, history);
    const explicitAct = explicit.actions.find((a) => a.type === "dispatch");
    expect(explicitAct?.args.unit_id).toBe("rover-1");
  });

  it("isolates GUARDIAN ruleCheck and judge from history and enforces physical limits", async () => {
    const historyMarker = "HISTORICAL_TURN_MARKER_ROVER2_OK";
    const history: ConversationTurn[] = [
      { role: "user", content: `Check rover-2 status (${historyMarker})` },
      { role: "assistant", content: "Rover-2 battery is 90% and nominal." },
    ];

    // 1. Structural isolation: GUARDIAN.judge sees only the current turn's text, never history.
    let judgePayload: Record<string, unknown> | null = null;
    let baseCalls = 0;
    mockChat.mockImplementation((tier: string, messages: Array<{ role: string; content: string }>) => {
      if (tier === "fast") {
        return Promise.resolve({ role: "assistant", content: "ESCALATE" });
      }
      if (tier === "large") {
        baseCalls += 1;
        if (baseCalls === 1) {
          return Promise.resolve({
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "pod_1",
                type: "function",
                function: {
                  name: "launch_pod",
                  arguments: JSON.stringify({ target_x: -130, target_z: -280, payload: "o2" }),
                },
              },
            ],
          });
        }
        return Promise.resolve({ role: "assistant", content: "O2 pod launched 30 m away." });
      }
      if (tier === "judge") {
        judgePayload = JSON.parse(messages[1].content) as Record<string, unknown>;
        return Promise.resolve({
          role: "assistant",
          content: JSON.stringify({ decision: "allow", reason: "Safe distance", injection_suspected: false }),
        });
      }
      return Promise.resolve({ role: "assistant", content: "" });
    });

    const podRes = await handleVoice("Launch an O2 pod 30 m east", makeContext({ leak_diameter_m: 0.0016 }), history);
    expect(podRes.actions.some((a) => a.type === "launch_pod")).toBe(true);
    expect(judgePayload).not.toBeNull();
    expect(String(judgePayload!.crew_request)).toContain("Launch an O2 pod 30 m east");
    expect(JSON.stringify(judgePayload)).not.toContain(historyMarker);
    expect(JSON.stringify(judgePayload)).not.toContain("Rover-2 battery is 90%");

    // 2. Physical-limit enforcement: low battery or high dust tau in live ctx still denies despite normal history.
    const lowBatteryCtx = makeContext({
      fleet: [{ id: "rover-2", kind: "rover_science", x: -100, z: -240, battery: 0.05, busy: false }],
    });
    expect(ruleCheck({ type: "dispatch", args: { unit_id: "rover-2", x: -160, z: -280 }, proposedBy: "BASE" }, lowBatteryCtx)?.decision).toBe("deny");

    const highTauCtx = makeContext({
      env: { pressure_pa: 750, air_temp_k: 220, tau: 2.2, wind_ms: 6, dose_rate_ugy_h: 10 },
    });
    expect(ruleCheck({ type: "dispatch", args: { unit_id: "drone-1", x: -160, z: -280 }, proposedBy: "BASE" }, highTauCtx)?.decision).toBe("deny");
  });

  it("uses live MissionContext telemetry instead of stale numbers in history", async () => {
    const history: ConversationTurn[] = [
      { role: "user", content: "How is my oxygen?" },
      { role: "assistant", content: "Primary O2 is 1.2 kg, 24.4 h remaining." },
    ];
    const updatedCtx = makeContext({
      suit: { suit_pressure_pa: 29600, o2_primary_kg: 0.35, o2_reserve_kg: 0.45, co2_pa: 210 },
    });

    let toolResultO2: number | undefined;
    mockChat.mockImplementation((_tier: string, messages: Array<{ role: string; content?: string }>) => {
      const toolMsg = messages.find((m) => m.role === "tool");
      if (!toolMsg) {
        return Promise.resolve({
          role: "assistant",
          content: null,
          tool_calls: [{ id: "m_1", type: "function", function: { name: "get_consumables_margin", arguments: "{}" } }],
        });
      }
      const parsed = JSON.parse(toolMsg.content ?? "{}") as { o2_primary_kg?: number; hours_left?: number };
      toolResultO2 = parsed.o2_primary_kg;
      return Promise.resolve({
        role: "assistant",
        content: `Live primary O2 is ${parsed.o2_primary_kg} kg, ${parsed.hours_left} h remaining.`,
      });
    });

    const res = await handleVoice("Check oxygen margin again", updatedCtx, history);
    expect(toolResultO2).toBe(0.35);
    expect(res.text).toContain("0.35 kg");
    expect(res.text).not.toContain("1.2 kg");
  });

  it("never leaks ESCALATE into speech or trace", async () => {
    const history: ConversationTurn[] = [
      { role: "user", content: "Check suit pressure" },
      { role: "assistant", content: "Suit pressure is 29.6 kPa." },
    ];

    mockChat
      .mockResolvedValueOnce({ role: "assistant", content: "ESCALATE" })
      .mockResolvedValueOnce({ role: "assistant", content: "Battery of rover-2 is 85%." });

    const res = await handleVoice("What about its battery?", makeContext(), history);
    expect(res.route).toEqual(["SUIT.VOICE-EXEC", "BASE"]);
    expect(res.text).toBe("Battery of rover-2 is 85%.");
    expect(res.text).not.toMatch(/ESCALATE/i);
    expect(JSON.stringify(res.trace)).not.toMatch(/ESCALATE/);

    mockChat
      .mockResolvedValueOnce({ role: "assistant", content: "ESCALATE" })
      .mockResolvedValueOnce({ role: "assistant", content: "ESCALATE Battery of rover-2 is 85%." });

    const stripped = await handleVoice("What about its battery?", makeContext(), history);
    expect(stripped.text).toBe("Battery of rover-2 is 85%.");
    expect(stripped.text).not.toMatch(/ESCALATE/i);
  });

  it("maintains bounded max-6 VoiceController history and clears on lang change and reset", async () => {
    vi.stubGlobal("AudioContext", makeAudioContextStub());

    const requests: Array<{ text: string; history?: ConversationTurn[] }> = [];
    let turnCounter = 0;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith("/api/tts")) {
        return new Response(new ArrayBuffer(8), { status: 200 });
      }
      const body = JSON.parse(String(init?.body ?? "{}")) as { text: string; history?: ConversationTurn[] };
      requests.push({ text: body.text, history: body.history });
      turnCounter += 1;
      return new Response(
        JSON.stringify({
          terrain: READY_TERRAIN,
          speech: `Reply ${turnCounter} for ${body.text}`,
          actions: [],
          trace: [],
          route: ["BASE"],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const store = new MissionStore();
    store.terrain = READY_TERRAIN;
    const vc = new VoiceController(store);

    // 4 server turns = 8 entries total, must stay bounded to latest 6 entries (3 pairs).
    await vc.handle("Where is rover-1?");
    await vc.handle("Where is rover-2?");
    await vc.handle("Where is drone-1?");
    await vc.handle("Send drone-1 to S2");

    expect(requests[0].history).toBeUndefined();
    expect(requests[1].history).toHaveLength(2);
    expect(requests[2].history).toHaveLength(4);
    expect(requests[3].history).toHaveLength(6);
    expect(vc.getHistory()).toHaveLength(6);
    expect(vc.getHistory()[0].content).toBe("Where is rover-2?");

    // Local <5 ms intent and repeat replay must not call server or mutate history.
    const beforeLocal = vc.getHistory();
    await vc.handle("open map");
    await vc.handle("repeat");
    expect(vc.getHistory()).toEqual(beforeLocal);

    // Failed HTTP 500 fallback must not append to history.
    fetchMock.mockResolvedValueOnce(new Response("error", { status: 500 }));
    await vc.handle("Check suit status");
    expect(vc.getHistory()).toEqual(beforeLocal);

    // Empty speech on HTTP 200 must not append to history.
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ terrain: READY_TERRAIN, speech: "   " }), { status: 200 }),
    );
    await vc.handle("Check environment");
    expect(vc.getHistory()).toEqual(beforeLocal);

    // Language switch clears history.
    setLang("es");
    expect(vc.getHistory()).toEqual([]);

    // setHistory / clearHistory public methods for B18 integration.
    vc.setHistory([
      { role: "user", content: "Turn 1" },
      { role: "assistant", content: "ESCALATE" },
      { role: "assistant", content: "Reply 1" },
    ]);
    expect(vc.getHistory()).toEqual([
      { role: "user", content: "Turn 1" },
      { role: "assistant", content: "Reply 1" },
    ]);

    // Store reset clears history.
    store.reset();
    expect(vc.getHistory()).toEqual([]);
  });
});
