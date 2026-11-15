import { getLang, onLangChange, type Lang } from "@th/shared";
import type { MissionStore, TranscriptLine } from "../state";

export const SESSION_DB_NAME = "tango-horizon-sessions";
export const SESSION_STORE_NAME = "sessions";
export const SESSION_UPDATED_INDEX = "updatedAt";
export const SESSION_LS_KEY = "th_chat_sessions_v1";
export const ACTIVE_SESSION_LS_KEY = "th_active_session_v1";
export const MAX_SAVED_SESSIONS = 20;
export const MAX_SESSION_ENTRIES = 200;
export const MAX_VOICE_HISTORY_TURNS = 6;
export const MAX_VOICE_TURN_CHARS = 400;
export const MAX_TITLE_CHARS = 48;

export type SessionScenario = "none" | "storm" | "sep2017" | "leak" | "rescue";

export interface SavedTranscriptEntry {
  id: string;
  who: "you" | "base" | "system";
  text: string;
  ts: number;
  metS: number;
  route?: string[];
  latencyMs?: number;
  lang?: Lang;
  excludeFromHistory?: boolean;
}

export interface SavedChatSession {
  id: string;
  title: string;
  lang: Lang;
  scenario: SessionScenario;
  createdAt: number;
  updatedAt: number;
  entries: SavedTranscriptEntry[];
}

export interface VoiceHistoryTurn {
  role: "user" | "assistant";
  content: string;
}

export interface VoiceHistoryBridge {
  setHistory(turns: VoiceHistoryTurn[]): void;
  clearHistory(): void;
}

export interface SessionStoreOptions {
  indexedDB?: IDBFactory | null;
  storage?: Storage | null;
  maxSessions?: number;
  maxEntries?: number;
}

function getDefaultIndexedDb(): IDBFactory | null {
  try {
    return typeof globalThis !== "undefined" && globalThis.indexedDB ? globalThis.indexedDB : null;
  } catch {
    return null;
  }
}

function getDefaultStorage(): Storage | null {
  try {
    return typeof globalThis !== "undefined" && globalThis.localStorage ? globalThis.localStorage : null;
  } catch {
    return null;
  }
}

export function createSessionId(now = Date.now()): string {
  return `sess-${now}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEntryId(now = Date.now()): string {
  return `tx-${now}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Generate a concise title from the active scenario and first user command (<= 48 chars). */
export function buildSessionTitle(
  scenario: SessionScenario,
  entries: readonly Pick<SavedTranscriptEntry, "who" | "text">[],
): string {
  const prefix = scenario === "none" ? "EVA" : scenario.toUpperCase();
  const firstUser = entries.find((e) => e.who === "you" && e.text.trim().length > 0);
  const raw = firstUser
    ? `${prefix}: ${firstUser.text.trim().replace(/\s+/g, " ")}`
    : `${prefix} session`;
  if (raw.length <= MAX_TITLE_CHARS) return raw;
  return `${raw.slice(0, MAX_TITLE_CHARS - 3).trimEnd()}...`;
}

/**
 * Extract up to 6 trailing finalized user/assistant turns matching activeLang,
 * each trimmed to 400 characters. Returns [] when the session language differs.
 */
export function toVoiceHistory(session: SavedChatSession, activeLang: Lang): VoiceHistoryTurn[] {
  if (session.lang !== activeLang) return [];
  const eligible = session.entries.filter(
    (e) =>
      (e.who === "you" || e.who === "base") &&
      !e.excludeFromHistory &&
      (!e.lang || e.lang === activeLang) &&
      e.text.trim().length > 0,
  );
  return eligible
    .slice(-MAX_VOICE_HISTORY_TURNS)
    .map((e) => ({
      role: (e.who === "you" ? "user" : "assistant") as "user" | "assistant",
      content: e.text.trim().slice(0, MAX_VOICE_TURN_CHARS).trim(),
    }))
    .filter((turn) => turn.content.length > 0);
}

export function exportSessionJson(session: SavedChatSession): string {
  return JSON.stringify(
    {
      id: session.id,
      title: session.title,
      lang: session.lang,
      scenario: session.scenario,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      entries: session.entries.map((e) => ({
        id: e.id,
        who: e.who,
        text: e.text,
        ts: e.ts,
        metS: e.metS,
        ...(e.route?.length ? { route: e.route } : {}),
        ...(typeof e.latencyMs === "number" ? { latencyMs: e.latencyMs } : {}),
      })),
    },
    null,
    2,
  );
}

export function exportSessionMarkdown(session: SavedChatSession): string {
  const lines: string[] = [
    `# ${session.title}`,
    "",
    `- **Session ID:** \`${session.id}\``,
    `- **Scenario:** ${session.scenario}`,
    `- **Language:** ${session.lang}`,
    `- **Created:** ${new Date(session.createdAt).toISOString()}`,
    `- **Updated:** ${new Date(session.updatedAt).toISOString()}`,
    `- **Entries:** ${session.entries.length}`,
    "",
    "## Transcript",
    "",
  ];

  if (session.entries.length === 0) {
    lines.push("_No finalized entries recorded._");
    return lines.join("\n");
  }

  for (const e of session.entries) {
    const meta: string[] = [
      new Date(e.ts).toISOString(),
      `MET ${Math.round(e.metS)}s`,
    ];
    if (e.route?.length) meta.push(`route: ${e.route.join(" -> ")}`);
    if (typeof e.latencyMs === "number") meta.push(`${Math.round(e.latencyMs)} ms`);
    lines.push(`- **${e.who.toUpperCase()}** (${meta.join(" | ")})`);
    lines.push(`  ${e.text}`);
  }

  return lines.join("\n");
}

function cloneEntry(e: SavedTranscriptEntry): SavedTranscriptEntry {
  return {
    id: e.id,
    who: e.who,
    text: e.text,
    ts: e.ts,
    metS: e.metS,
    ...(e.route?.length ? { route: [...e.route] } : {}),
    ...(typeof e.latencyMs === "number" ? { latencyMs: e.latencyMs } : {}),
    ...(e.lang ? { lang: e.lang } : {}),
    ...(e.excludeFromHistory ? { excludeFromHistory: true } : {}),
  };
}

function cloneSession(s: SavedChatSession): SavedChatSession {
  return {
    id: s.id,
    title: s.title,
    lang: s.lang,
    scenario: s.scenario,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    entries: s.entries.map(cloneEntry),
  };
}

function isQuotaError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; code?: number };
  return e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED" || e.code === 22;
}

/**
 * Client-side session persistence backed by IndexedDB (`tango-horizon-sessions`),
 * falling back automatically to `localStorage` (`th_chat_sessions_v1`).
 */
export class SessionStore {
  private readonly idbFactory: IDBFactory | null;
  private readonly storage: Storage | null;
  private readonly maxSessions: number;
  private readonly maxEntries: number;
  private dbPromise: Promise<IDBDatabase> | null = null;
  private memoryFallback = new Map<string, SavedChatSession>();
  private memoryActiveId: string | null = null;

  constructor(opts: SessionStoreOptions = {}) {
    this.idbFactory = opts.indexedDB === undefined ? getDefaultIndexedDb() : opts.indexedDB;
    this.storage = opts.storage === undefined ? getDefaultStorage() : opts.storage;
    this.maxSessions = opts.maxSessions ?? MAX_SAVED_SESSIONS;
    this.maxEntries = opts.maxEntries ?? MAX_SESSION_ENTRIES;
  }

  private openDb(): Promise<IDBDatabase> {
    if (!this.idbFactory) return Promise.reject(new Error("IndexedDB unavailable"));
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      try {
        const req = this.idbFactory!.open(SESSION_DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          const store = db.objectStoreNames.contains(SESSION_STORE_NAME)
            ? req.transaction!.objectStore(SESSION_STORE_NAME)
            : db.createObjectStore(SESSION_STORE_NAME, { keyPath: "id" });
          if (!store.indexNames.contains(SESSION_UPDATED_INDEX)) {
            store.createIndex(SESSION_UPDATED_INDEX, "updatedAt", { unique: false });
          }
        };
        req.onsuccess = () => {
          const db = req.result;
          db.onversionchange = () => {
            db.close();
            this.dbPromise = null;
          };
          resolve(db);
        };
        req.onerror = () => {
          this.dbPromise = null;
          reject(req.error ?? new Error("IndexedDB open failed"));
        };
      } catch (err) {
        this.dbPromise = null;
        reject(err);
      }
    });

    return this.dbPromise;
  }

  private normalizeSession(session: SavedChatSession): SavedChatSession {
    const entries = session.entries.slice(-this.maxEntries).map(cloneEntry);
    const title = session.title.trim()
      ? session.title.trim().slice(0, MAX_TITLE_CHARS)
      : buildSessionTitle(session.scenario, entries);
    return {
      ...cloneSession(session),
      title,
      entries,
    };
  }

  private readFallbackSessions(): SavedChatSession[] {
    if (!this.storage) {
      return [...this.memoryFallback.values()]
        .map(cloneSession)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    }
    try {
      const raw = this.storage.getItem(SESSION_LS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .filter((item): item is SavedChatSession => Boolean(item && typeof item.id === "string"))
        .map(cloneSession)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }

  private writeFallbackSessions(sessions: SavedChatSession[]): void {
    const sorted = [...sessions]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, this.maxSessions);

    if (!this.storage) {
      this.memoryFallback.clear();
      for (const s of sorted) this.memoryFallback.set(s.id, cloneSession(s));
      return;
    }

    const working = sorted.map(cloneSession);
    while (working.length > 0) {
      try {
        this.storage.setItem(SESSION_LS_KEY, JSON.stringify(working));
        return;
      } catch (err) {
        if (!isQuotaError(err)) return;
        // Evict oldest session first; if only 1 remains, halve its oldest entries until it fits.
        if (working.length > 1) {
          working.pop();
        } else if (working[0].entries.length > 1) {
          const keep = Math.floor(working[0].entries.length / 2);
          working[0].entries = working[0].entries.slice(-keep);
        } else {
          return;
        }
      }
    }
    try {
      this.storage.setItem(SESSION_LS_KEY, "[]");
    } catch {
      // Ignore unrecoverable storage quota errors.
    }
  }

  private async listIdbSessions(db: IDBDatabase): Promise<SavedChatSession[]> {
    return new Promise<SavedChatSession[]>((resolve, reject) => {
      const tx = db.transaction(SESSION_STORE_NAME, "readonly");
      const store = tx.objectStore(SESSION_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? (req.result as SavedChatSession[]) : [];
        resolve(rows.map(cloneSession).sort((a, b) => b.updatedAt - a.updatedAt));
      };
      req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    });
  }

  private async putIdbSession(db: IDBDatabase, session: SavedChatSession): Promise<void> {
    const existing = await this.listIdbSessions(db);
    const others = existing.filter((s) => s.id !== session.id);
    const evictIds = others.length >= this.maxSessions
      ? others.slice(this.maxSessions - 1).map((s) => s.id)
      : [];

    const runWrite = (idsToDelete: string[]) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(SESSION_STORE_NAME, "readwrite");
        const store = tx.objectStore(SESSION_STORE_NAME);
        for (const id of idsToDelete) store.delete(id);
        store.put(cloneSession(session));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
        tx.onabort = () => reject(tx.error ?? new Error("IndexedDB write aborted"));
      });

    try {
      await runWrite(evictIds);
    } catch (err) {
      if (!isQuotaError(err)) throw err;
      const remaining = others.filter((s) => !evictIds.includes(s.id));
      while (remaining.length > 0) {
        const oldest = remaining.pop()!;
        evictIds.push(oldest.id);
        try {
          await runWrite(evictIds);
          return;
        } catch (retryErr) {
          if (!isQuotaError(retryErr)) throw retryErr;
        }
      }
    }
  }

  async listSessions(): Promise<SavedChatSession[]> {
    try {
      const db = await this.openDb();
      return await this.listIdbSessions(db);
    } catch {
      return this.readFallbackSessions();
    }
  }

  async getSession(id: string): Promise<SavedChatSession | null> {
    if (!id) return null;
    try {
      const db = await this.openDb();
      return await new Promise<SavedChatSession | null>((resolve, reject) => {
        const tx = db.transaction(SESSION_STORE_NAME, "readonly");
        const req = tx.objectStore(SESSION_STORE_NAME).get(id);
        req.onsuccess = () => resolve(req.result ? cloneSession(req.result as SavedChatSession) : null);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB get failed"));
      });
    } catch {
      return this.readFallbackSessions().find((s) => s.id === id) ?? null;
    }
  }

  async saveSession(session: SavedChatSession): Promise<SavedChatSession> {
    const normalized = this.normalizeSession(session);
    try {
      const db = await this.openDb();
      await this.putIdbSession(db, normalized);
      return normalized;
    } catch {
      const existing = this.readFallbackSessions().filter((s) => s.id !== normalized.id);
      existing.unshift(normalized);
      this.writeFallbackSessions(existing);
      return normalized;
    }
  }

  async deleteSession(id: string): Promise<void> {
    if (this.getActiveSessionId() === id) {
      this.setActiveSessionId(null);
    }
    try {
      const db = await this.openDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(SESSION_STORE_NAME, "readwrite");
        tx.objectStore(SESSION_STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB delete failed"));
      });
    } catch {
      const remaining = this.readFallbackSessions().filter((s) => s.id !== id);
      this.writeFallbackSessions(remaining);
    }
  }

  getActiveSessionId(): string | null {
    if (!this.storage) return this.memoryActiveId;
    try {
      return this.storage.getItem(ACTIVE_SESSION_LS_KEY);
    } catch {
      return this.memoryActiveId;
    }
  }

  setActiveSessionId(id: string | null): void {
    this.memoryActiveId = id;
    if (!this.storage) return;
    try {
      if (id === null) this.storage.removeItem(ACTIVE_SESSION_LS_KEY);
      else this.storage.setItem(ACTIVE_SESSION_LS_KEY, id);
    } catch {
      // Ignore storage failures for active-session pointer.
    }
  }

  /**
   * Restore the last active session on startup.
   * When an explicit unsaved activeSessionId was recorded (e.g. after reset or New session),
   * return null so the fresh session starts empty while preserving prior sessions.
   */
  async getLastActiveSession(): Promise<SavedChatSession | null> {
    const activeId = this.getActiveSessionId();
    if (activeId) {
      return this.getSession(activeId);
    }
    const sessions = await this.listSessions();
    return sessions[0] ?? null;
  }
}

/**
 * Coordinates MissionStore finalized transcripts, SessionStore persistence,
 * and VoiceController multi-turn history synchronization.
 */
export class ChatSessionManager {
  private activeSession: SavedChatSession;
  private sessionsCache: SavedChatSession[] = [];
  private writeChain: Promise<void> = Promise.resolve();
  private listeners = new Set<() => void>();
  private unsubFinal?: () => void;
  private unsubReset?: () => void;
  private unsubLang?: () => void;

  constructor(
    private readonly missionStore: MissionStore,
    private readonly sessionStore: SessionStore,
    private readonly voice?: VoiceHistoryBridge,
  ) {
    this.activeSession = this.createBlankSession(getLang());
    this.unsubFinal = this.missionStore.onTranscriptFinal((line) => {
      void this.appendFinalLine(line);
    });
    this.unsubReset = this.missionStore.onReset(() => {
      this.handleReset();
    });
    this.unsubLang = onLangChange((lang) => {
      this.voice?.clearHistory();
      if (this.activeSession.entries.length === 0) {
        this.activeSession.lang = lang;
      }
      this.emit();
    });
  }

  dispose(): void {
    this.unsubFinal?.();
    this.unsubReset?.();
    this.unsubLang?.();
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const fn of this.listeners) fn();
  }

  private createBlankSession(lang: Lang): SavedChatSession {
    const now = Date.now();
    return {
      id: createSessionId(now),
      title: buildSessionTitle(this.missionStore.activeScenario, []),
      lang,
      scenario: this.missionStore.activeScenario,
      createdAt: now,
      updatedAt: now,
      entries: [],
    };
  }

  getActiveSession(): SavedChatSession {
    return cloneSession(this.activeSession);
  }

  getSessionsSnapshot(): SavedChatSession[] {
    return this.sessionsCache.map(cloneSession);
  }

  flush(): Promise<void> {
    return this.writeChain;
  }

  async refreshList(): Promise<SavedChatSession[]> {
    await this.writeChain;
    this.sessionsCache = await this.sessionStore.listSessions();
    this.emit();
    return this.getSessionsSnapshot();
  }

  async restoreLastSession(): Promise<SavedChatSession | null> {
    await this.writeChain;
    const restored = await this.sessionStore.getLastActiveSession();
    this.sessionsCache = await this.sessionStore.listSessions();
    if (!restored) {
      this.activeSession = this.createBlankSession(getLang());
      this.sessionStore.setActiveSessionId(this.activeSession.id);
      this.voice?.clearHistory();
      this.emit();
      return null;
    }

    this.applyLoadedSession(restored);
    return cloneSession(restored);
  }

  async appendFinalLine(line: TranscriptLine): Promise<SavedChatSession> {
    if (!line.final) return this.getActiveSession();

    const activeLang = getLang();
    // Keep saved sessions single-language when the user speaks after switching UI language.
    if (this.activeSession.entries.length > 0 && this.activeSession.lang !== activeLang) {
      this.activeSession = this.createBlankSession(activeLang);
    } else if (this.activeSession.entries.length === 0) {
      this.activeSession.lang = activeLang;
    }

    if (this.activeSession.entries.length === 0) {
      this.activeSession.scenario = this.missionStore.activeScenario;
    } else if (this.missionStore.activeScenario !== "none" && this.activeSession.scenario === "none") {
      this.activeSession.scenario = this.missionStore.activeScenario;
    }

    const now = line.ts || Date.now();
    const entry: SavedTranscriptEntry = {
      id: line.id ?? createEntryId(now),
      who: line.who,
      text: line.text,
      ts: now,
      metS: line.metS ?? Math.round(this.missionStore.metS),
      ...(line.route?.length ? { route: [...line.route] } : {}),
      ...(typeof line.latencyMs === "number" ? { latencyMs: line.latencyMs } : {}),
      ...(line.lang ? { lang: line.lang } : { lang: activeLang }),
      ...(line.excludeFromHistory ? { excludeFromHistory: true } : {}),
    };

    this.activeSession.entries.push(entry);
    if (this.activeSession.entries.length > MAX_SESSION_ENTRIES) {
      this.activeSession.entries = this.activeSession.entries.slice(-MAX_SESSION_ENTRIES);
    }
    this.activeSession.updatedAt = now;
    this.activeSession.title = buildSessionTitle(this.activeSession.scenario, this.activeSession.entries);
    this.sessionStore.setActiveSessionId(this.activeSession.id);

    const snapshot = cloneSession(this.activeSession);
    this.writeChain = this.writeChain.then(async () => {
      await this.sessionStore.saveSession(snapshot);
      this.sessionsCache = await this.sessionStore.listSessions();
      this.emit();
    });
    await this.writeChain;
    return snapshot;
  }

  newSession(): SavedChatSession {
    this.activeSession = this.createBlankSession(getLang());
    this.sessionStore.setActiveSessionId(this.activeSession.id);
    this.missionStore.loadTranscriptLines([]);
    this.voice?.clearHistory();
    this.emit();
    return this.getActiveSession();
  }

  /** Preserve prior sessions and assign a fresh session ID for a simulation reset. */
  prepareResetSession(): SavedChatSession {
    this.activeSession = this.createBlankSession(getLang());
    this.sessionStore.setActiveSessionId(this.activeSession.id);
    this.voice?.clearHistory();
    this.emit();
    return this.getActiveSession();
  }

  private handleReset(): void {
    this.prepareResetSession();
  }

  async loadSession(id: string): Promise<SavedChatSession | null> {
    await this.writeChain;
    const found = await this.sessionStore.getSession(id);
    if (!found) return null;
    this.applyLoadedSession(found);
    return cloneSession(found);
  }

  async deleteSession(id: string): Promise<void> {
    await this.writeChain;
    const deletingActive = this.activeSession.id === id;
    await this.sessionStore.deleteSession(id);
    this.sessionsCache = await this.sessionStore.listSessions();
    if (deletingActive) {
      this.activeSession = this.createBlankSession(getLang());
      this.sessionStore.setActiveSessionId(this.activeSession.id);
      this.missionStore.loadTranscriptLines([]);
      this.voice?.clearHistory();
    }
    this.emit();
  }

  private applyLoadedSession(session: SavedChatSession): void {
    this.activeSession = cloneSession(session);
    this.sessionStore.setActiveSessionId(session.id);

    const lines: TranscriptLine[] = session.entries.map((e) => ({
      id: e.id,
      who: e.who,
      text: e.text,
      final: true,
      ts: e.ts,
      metS: e.metS,
      route: e.route ? [...e.route] : undefined,
      latencyMs: e.latencyMs,
      lang: e.lang,
      excludeFromHistory: e.excludeFromHistory,
    }));
    this.missionStore.loadTranscriptLines(lines);

    const history = toVoiceHistory(session, getLang());
    if (history.length > 0) {
      this.voice?.setHistory(history);
    } else {
      this.voice?.clearHistory();
    }
    this.emit();
  }
}
