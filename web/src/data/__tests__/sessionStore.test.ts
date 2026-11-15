import { beforeEach, describe, expect, it } from "vitest";
import { setLang } from "@th/shared";
import { MissionStore } from "../../state";
import {
  ACTIVE_SESSION_LS_KEY,
  buildSessionTitle,
  ChatSessionManager,
  exportSessionJson,
  exportSessionMarkdown,
  MAX_SAVED_SESSIONS,
  MAX_SESSION_ENTRIES,
  MAX_TITLE_CHARS,
  MAX_VOICE_HISTORY_TURNS,
  MAX_VOICE_TURN_CHARS,
  SESSION_DB_NAME,
  SESSION_LS_KEY,
  SESSION_STORE_NAME,
  SESSION_UPDATED_INDEX,
  SessionStore,
  toVoiceHistory,
  type SavedChatSession,
  type VoiceHistoryBridge,
  type VoiceHistoryTurn,
} from "../sessionStore";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  quotaLimitBytes = Number.POSITIVE_INFINITY;

  get length(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }

  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  setItem(key: string, value: string): void {
    if (key === SESSION_LS_KEY && value.length > this.quotaLimitBytes) {
      const err = new Error("Storage quota exceeded");
      err.name = "QuotaExceededError";
      throw err;
    }
    this.map.set(key, value);
  }
}

function createFakeIndexedDb(): { factory: IDBFactory; createdIndexes: string[] } {
  const stores = new Map<string, Map<string, unknown>>();
  const createdIndexes: string[] = [];

  const makeReq = <T>(run: () => T) => {
    const req: Record<string, unknown> = {
      result: undefined,
      error: null,
      onsuccess: null,
      onerror: null,
    };
    queueMicrotask(() => {
      try {
        req.result = run();
        if (typeof req.onsuccess === "function") (req.onsuccess as (ev: unknown) => void)({});
      } catch (err) {
        req.error = err;
        if (typeof req.onerror === "function") (req.onerror as (ev: unknown) => void)({});
      }
    });
    return req;
  };

  const factory = {
    open(name: string) {
      expect(name).toBe(SESSION_DB_NAME);
      const req: Record<string, unknown> = {
        result: null,
        error: null,
        transaction: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      };

      const objectStoreNames = {
        contains: (storeName: string) => stores.has(storeName),
      };

      const makeStoreHandle = (storeName: string) => {
        if (!stores.has(storeName)) stores.set(storeName, new Map());
        const table = stores.get(storeName)!;
        return {
          indexNames: {
            contains: (idxName: string) => createdIndexes.includes(idxName),
          },
          createIndex: (idxName: string) => {
            createdIndexes.push(idxName);
            return {};
          },
          getAll: () => makeReq(() => [...table.values()]),
          get: (id: string) => makeReq(() => table.get(id)),
          put: (value: { id: string }) =>
            makeReq(() => {
              table.set(value.id, structuredClone(value));
              return value.id;
            }),
          delete: (id: string) =>
            makeReq(() => {
              table.delete(id);
              return undefined;
            }),
        };
      };

      const db = {
        objectStoreNames,
        createObjectStore: (storeName: string) => makeStoreHandle(storeName),
        close: () => {},
        onversionchange: null,
        transaction: (storeName: string) => {
          const tx: Record<string, unknown> = {
            oncomplete: null,
            onerror: null,
            onabort: null,
            objectStore: () => makeStoreHandle(storeName),
          };
          queueMicrotask(() => {
            queueMicrotask(() => {
              if (typeof tx.oncomplete === "function") (tx.oncomplete as () => void)();
            });
          });
          return tx;
        },
      };

      queueMicrotask(() => {
        req.result = db;
        req.transaction = { objectStore: (storeName: string) => makeStoreHandle(storeName) };
        if (!stores.has(SESSION_STORE_NAME) && typeof req.onupgradeneeded === "function") {
          (req.onupgradeneeded as () => void)();
        }
        if (typeof req.onsuccess === "function") (req.onsuccess as () => void)();
      });

      return req;
    },
  } as unknown as IDBFactory;

  return { factory, createdIndexes };
}

function makeVoiceSpy(): VoiceHistoryBridge & {
  history: VoiceHistoryTurn[];
  clearCalls: number;
  setCalls: number;
} {
  return {
    history: [],
    clearCalls: 0,
    setCalls: 0,
    setHistory(turns: VoiceHistoryTurn[]) {
      this.setCalls += 1;
      this.history = turns.map((t) => ({ ...t }));
    },
    clearHistory() {
      this.clearCalls += 1;
      this.history = [];
    },
  };
}

describe("SessionStore & ChatSessionManager", () => {
  beforeEach(() => {
    setLang("en");
  });

  it("persists and restores the last active session with metS, route, and latencyMs", async () => {
    const storage = new MemoryStorage();
    const mission1 = new MissionStore();
    mission1.metS = 1525;
    mission1.activeScenario = "storm";

    const store1 = new SessionStore({ indexedDB: null, storage });
    const voice1 = makeVoiceSpy();
    const mgr1 = new ChatSessionManager(mission1, store1, voice1);

    // Interim transcript must not persist.
    mission1.pushTranscript("you", "Base, suit", false);
    expect(await store1.listSessions()).toHaveLength(0);

    // Finalized user + base turns persist with metadata.
    mission1.pushTranscript("you", "Base, suit status and oxygen margin", true);
    mission1.metS = 1532;
    mission1.pushTranscript("base", "Suit nominal at 29.6 kPa; O2 primary 90%.", true, {
      route: ["SUIT.VOICE-EXEC", "BASE", "SUIT.HEALTH"],
      latencyMs: 412,
    });
    await mgr1.refreshList();

    // Simulate reload: new MissionStore + ChatSessionManager over the same storage.
    const mission2 = new MissionStore();
    const store2 = new SessionStore({ indexedDB: null, storage });
    const voice2 = makeVoiceSpy();
    const mgr2 = new ChatSessionManager(mission2, store2, voice2);

    const restored = await mgr2.restoreLastSession();
    expect(restored).not.toBeNull();
    expect(restored!.scenario).toBe("storm");
    expect(restored!.title).toMatch(/^STORM: Base, suit status/);
    expect(restored!.title.length).toBeLessThanOrEqual(MAX_TITLE_CHARS);
    expect(mission2.transcripts).toHaveLength(2);
    expect(mission2.transcripts[0].metS).toBe(1525);
    expect(mission2.transcripts[1].route).toEqual(["SUIT.VOICE-EXEC", "BASE", "SUIT.HEALTH"]);
    expect(mission2.transcripts[1].latencyMs).toBe(412);
    expect(voice2.history).toEqual([
      { role: "user", content: "Base, suit status and oxygen margin" },
      { role: "assistant", content: "Suit nominal at 29.6 kPa; O2 primary 90%." },
    ]);

    mgr1.dispose();
    mgr2.dispose();
  });

  it("works with IndexedDB and creates the updatedAt index", async () => {
    const storage = new MemoryStorage();
    const { factory, createdIndexes } = createFakeIndexedDb();
    const store = new SessionStore({ indexedDB: factory, storage });

    const saved = await store.saveSession({
      id: "idb-1",
      title: "",
      lang: "en",
      scenario: "none",
      createdAt: 1000,
      updatedAt: 2000,
      entries: [
        { id: "e1", who: "you", text: "Base, check route to site two", ts: 1500, metS: 1420 },
        { id: "e2", who: "base", text: "Route plotted.", ts: 2000, metS: 1422, route: ["BASE", "EVA-PLANNER"], latencyMs: 310 },
      ],
    });

    expect(createdIndexes).toContain(SESSION_UPDATED_INDEX);
    expect(saved.title).toBe("EVA: Base, check route to site two");

    const loaded = await store.getSession("idb-1");
    expect(loaded).not.toBeNull();
    expect(loaded!.entries[1].route).toEqual(["BASE", "EVA-PLANNER"]);
  });

  it("evicts oldest sessions beyond 20 and avoids QuotaExceededError", async () => {
    const storage = new MemoryStorage();
    const store = new SessionStore({ indexedDB: null, storage });

    for (let i = 1; i <= 23; i++) {
      await store.saveSession({
        id: `sess-${i}`,
        title: `EVA: Order ${i}`,
        lang: "en",
        scenario: "none",
        createdAt: i * 100,
        updatedAt: i * 1000,
        entries: [{ id: `e-${i}`, who: "you", text: `Order ${i}`, ts: i * 1000, metS: 1420 + i }],
      });
    }

    const list = await store.listSessions();
    expect(list).toHaveLength(MAX_SAVED_SESSIONS);
    // Ordered newest first; sessions 1..3 should have been evicted.
    expect(list[0].id).toBe("sess-23");
    expect(list[list.length - 1].id).toBe("sess-4");
    expect(await store.getSession("sess-1")).toBeNull();
    expect(await store.getSession("sess-3")).toBeNull();

    // Tight localStorage quota triggers fallback eviction without throwing QuotaExceededError.
    storage.quotaLimitBytes = 1200;
    await expect(
      store.saveSession({
        id: "sess-24",
        title: "EVA: Order 24",
        lang: "en",
        scenario: "none",
        createdAt: 2400,
        updatedAt: 24000,
        entries: [{ id: "e-24", who: "you", text: "Order 24", ts: 24000, metS: 1444 }],
      }),
    ).resolves.toBeDefined();
    const postQuotaList = await store.listSessions();
    expect(postQuotaList.length).toBeGreaterThanOrEqual(1);
    expect(postQuotaList[0].id).toBe("sess-24");
  });

  it("caps stored entries per session at 200 and truncates long titles to 48 chars", async () => {
    const storage = new MemoryStorage();
    const store = new SessionStore({ indexedDB: null, storage });

    const entries = Array.from({ length: 215 }, (_, idx) => ({
      id: `tx-${idx}`,
      who: idx % 2 === 0 ? ("you" as const) : ("base" as const),
      text: `Message number ${idx} with detailed telemetry check for Gale Crater EVA`,
      ts: 1000 + idx,
      metS: 1400 + idx,
    }));

    const title = buildSessionTitle("sep2017", entries);
    expect(title.length).toBeLessThanOrEqual(MAX_TITLE_CHARS);
    expect(title.endsWith("...")).toBe(true);

    const saved = await store.saveSession({
      id: "cap-test",
      title: "",
      lang: "en",
      scenario: "sep2017",
      createdAt: 1000,
      updatedAt: 2000,
      entries,
    });
    expect(saved.entries).toHaveLength(MAX_SESSION_ENTRIES);
    expect(saved.entries[0].id).toBe("tx-15");
    expect(saved.entries[saved.entries.length - 1].id).toBe("tx-214");
  });

  it("extracts at most 6 trailing you/base turns trimmed to 400 chars and guards against language mismatch", () => {
    const longText = "A".repeat(520);
    const session: SavedChatSession = {
      id: "hist-1",
      title: "EVA: Check status",
      lang: "en",
      scenario: "none",
      createdAt: 1,
      updatedAt: 10,
      entries: [
        { id: "1", who: "you", text: "Turn 1", ts: 1, metS: 10 },
        { id: "2", who: "base", text: "Reply 1", ts: 2, metS: 11 },
        { id: "3", who: "system", text: "System notice", ts: 3, metS: 12 },
        { id: "4", who: "you", text: "Open tactical map", ts: 4, metS: 13, excludeFromHistory: true },
        { id: "5", who: "you", text: "Turn 2", ts: 5, metS: 14 },
        { id: "6", who: "base", text: "Reply 2", ts: 6, metS: 15 },
        { id: "7", who: "you", text: "Turn 3", ts: 7, metS: 16 },
        { id: "8", who: "base", text: "Reply 3", ts: 8, metS: 17 },
        { id: "9", who: "you", text: "Turn 4", ts: 9, metS: 18 },
        { id: "10", who: "base", text: longText, ts: 10, metS: 19 },
      ],
    };

    const enTurns = toVoiceHistory(session, "en");
    expect(enTurns).toHaveLength(MAX_VOICE_HISTORY_TURNS);
    expect(enTurns.map((t) => t.role)).toEqual([
      "user",
      "assistant",
      "user",
      "assistant",
      "user",
      "assistant",
    ]);
    expect(enTurns[0].content).toBe("Turn 2");
    expect(enTurns[5].content.length).toBe(MAX_VOICE_TURN_CHARS);

    // Language mismatch must return [] so older sessions do not populate LLM history.
    expect(toVoiceHistory(session, "es")).toEqual([]);
  });

  it("displays mismatched-language sessions without populating VoiceController history", async () => {
    const storage = new MemoryStorage();
    const store = new SessionStore({ indexedDB: null, storage });
    await store.saveSession({
      id: "es-sess",
      title: "EVA: Estado del traje",
      lang: "es",
      scenario: "none",
      createdAt: 100,
      updatedAt: 200,
      entries: [
        { id: "1", who: "you", text: "Base, estado del traje", ts: 100, metS: 1420, lang: "es" },
        { id: "2", who: "base", text: "Traje nominal a 29.6 kPa.", ts: 200, metS: 1422, lang: "es" },
      ],
    });

    setLang("en");
    const mission = new MissionStore();
    const voice = makeVoiceSpy();
    const mgr = new ChatSessionManager(mission, store, voice);

    const loaded = await mgr.loadSession("es-sess");
    expect(loaded).not.toBeNull();
    expect(mission.transcripts).toHaveLength(2);
    expect(voice.history).toEqual([]);
    expect(voice.setCalls).toBe(0);
    expect(voice.clearCalls).toBeGreaterThanOrEqual(1);

    // Switching language clears voice history immediately.
    setLang("es");
    await mgr.loadSession("es-sess");
    expect(voice.history).toHaveLength(2);
    setLang("fr");
    expect(voice.history).toEqual([]);

    mgr.dispose();
  });

  it("preserves prior sessions and starts a fresh session ID on reset() and newSession()", async () => {
    const storage = new MemoryStorage();
    const mission = new MissionStore();
    const store = new SessionStore({ indexedDB: null, storage });
    const voice = makeVoiceSpy();
    const mgr = new ChatSessionManager(mission, store, voice);

    mission.pushTranscript("you", "Base, plan route to site two", true);
    mission.pushTranscript("base", "Route plotted to S2.", true, { route: ["BASE", "EVA-PLANNER"], latencyMs: 250 });
    await mgr.refreshList();

    const firstId = mgr.getActiveSession().id;
    expect(storage.getItem(ACTIVE_SESSION_LS_KEY)).toBe(firstId);

    mission.reset();
    const afterResetId = mgr.getActiveSession().id;
    expect(afterResetId).not.toBe(firstId);
    expect(mission.transcripts).toEqual([]);
    expect(voice.history).toEqual([]);
    expect((await store.listSessions()).map((s) => s.id)).toContain(firstId);

    // Reloading right after reset starts on the fresh empty session while keeping prior history.
    const missionReload = new MissionStore();
    const storeReload = new SessionStore({ indexedDB: null, storage });
    const voiceReload = makeVoiceSpy();
    const mgrReload = new ChatSessionManager(missionReload, storeReload, voiceReload);
    const restored = await mgrReload.restoreLastSession();
    expect(restored).toBeNull();
    expect(missionReload.transcripts).toEqual([]);
    expect((await storeReload.listSessions()).map((s) => s.id)).toContain(firstId);

    // New session button behavior also keeps prior sessions intact.
    await mgrReload.loadSession(firstId);
    expect(missionReload.transcripts).toHaveLength(2);
    const fresh = mgrReload.newSession();
    expect(fresh.id).not.toBe(firstId);
    expect(missionReload.transcripts).toEqual([]);
    expect(voiceReload.history).toEqual([]);
    expect(await storeReload.getSession(firstId)).not.toBeNull();

    mgr.dispose();
    mgrReload.dispose();
  });

  it("exports valid JSON and Markdown mission debriefs", () => {
    const session: SavedChatSession = {
      id: "exp-1",
      title: "LEAK: Emergency suit leak",
      lang: "en",
      scenario: "leak",
      createdAt: 1700000000000,
      updatedAt: 1700000010000,
      entries: [
        {
          id: "e1",
          who: "you",
          text: "Emergency suit leak",
          ts: 1700000000000,
          metS: 1450,
        },
        {
          id: "e2",
          who: "base",
          text: "O2 pod launched and rescue-1 dispatched.",
          ts: 1700000010000,
          metS: 1460,
          route: ["SUIT.VOICE-EXEC", "BASE"],
          latencyMs: 380,
        },
      ],
    };

    const json = exportSessionJson(session);
    const parsed = JSON.parse(json) as SavedChatSession;
    expect(parsed.id).toBe("exp-1");
    expect(parsed.entries[1].metS).toBe(1460);
    expect(parsed.entries[1].route).toEqual(["SUIT.VOICE-EXEC", "BASE"]);
    expect(parsed.entries[1].latencyMs).toBe(380);

    const md = exportSessionMarkdown(session);
    expect(md).toContain("# LEAK: Emergency suit leak");
    expect(md).toContain("MET 1460s");
    expect(md).toContain("route: SUIT.VOICE-EXEC -> BASE");
    expect(md).toContain("380 ms");
    expect(md).toContain("O2 pod launched and rescue-1 dispatched.");
  });
});
