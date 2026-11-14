import { AsyncLocalStorage } from "node:async_hooks";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { TOOLS } from "./registry.js";
import type { MissionContext, ToolDef } from "../types.js";

/** One in-process MCP server per domain; mission context flows via AsyncLocalStorage. */
export const missionScope = new AsyncLocalStorage<{ ctx: MissionContext; caller: string }>();

const clients = new Map<string, Client>();
const servers = new Map<string, McpServer>();
let startupPromise: Promise<void> | null = null;

async function initMcpServers(): Promise<void> {
  const byServer = new Map<string, ToolDef[]>();
  for (const t of TOOLS) {
    const list = byServer.get(t.server);
    if (list) list.push(t);
    else byServer.set(t.server, [t]);
  }

  for (const [name, tools] of byServer) {
    const server = new McpServer({ name: `mcp-${name}`, version: "1.0.0" });
    for (const t of tools) {
      server.registerTool(
        t.name,
        {
          description: t.description,
          inputSchema: t.schema as any,
        },
        async (args: any) => {
          const scope = missionScope.getStore();
          if (!scope) throw new Error("Missing mission context in AsyncLocalStorage");
          const result = await t.run(args ?? {}, scope.ctx, scope.caller);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }],
          };
        },
      );
    }

    const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    const client = new Client({ name: `tango-client-${name}`, version: "1.0.0" });
    await client.connect(clientTransport);
    servers.set(name, server);
    clients.set(name, client);
  }
}

export function startMcpServers(): Promise<void> {
  if (!startupPromise) {
    startupPromise = initMcpServers().catch((err) => {
      startupPromise = null;
      throw err;
    });
  }
  return startupPromise;
}

export async function callTool(t: ToolDef, args: unknown): Promise<unknown> {
  const scope = missionScope.getStore();
  if (!scope) throw new Error("Missing mission context in AsyncLocalStorage");

  const client = clients.get(t.server);
  if (client) {
    try {
      const res = await client.callTool({
        name: t.name,
        arguments: (args ?? {}) as Record<string, unknown>,
      });
      if (!res.isError) {
        const text = (res.content as { type: string; text?: string }[])[0]?.text ?? "null";
        return JSON.parse(text);
      }
    } catch {
      // Fall back to direct execution below if in-memory MCP transport fails
    }
  }

  return t.run(args ?? {}, scope.ctx, scope.caller);
}

export function getRegisteredServerNames(): string[] {
  return [...servers.keys()].map((s) => `mcp-${s}`);
}
