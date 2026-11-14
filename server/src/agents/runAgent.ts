import { z } from "zod";
import { chat } from "../llm/provider.js";
import type { Tier } from "../config.js";
import { asOpenAI, toolsFor } from "./tools/registry.js";
import { callTool, missionScope, startMcpServers } from "./tools/mcp.js";
import { review } from "./guardian.js";
import type { Action, MissionContext, ToolDef, TraceEvent } from "./types.js";

export interface AgentSpec {
  name: string;
  tier: Tier;
  system: string;
  tools: string[];
  canDelegate?: boolean;
}

export interface AgentResult {
  text: string;
  actions: Action[];
  trace: TraceEvent[];
}

export type DelegateHandler = (
  agent: string,
  objective: string,
  ctx: MissionContext,
  userRequest: string,
  depth: number,
) => Promise<AgentResult>;

let delegateHandler: DelegateHandler | null = null;

export function setDelegateHandler(fn: DelegateHandler): void {
  delegateHandler = fn;
}

const MAX_DELEGATION_DEPTH = 2;

const DelegateSchema = z.object({
  agent: z
    .string()
    .describe("Target specialist agent name, e.g. SUIT.HEALTH, EVA-PLANNER, SCIENCE, WEATHER-RAD, MAINTENANCE, or ROBOT.<id>"),
  objective: z.string().max(300).describe("Clear objective for the specialist agent"),
});

function tryParseJsonToolCall(content: string | null | undefined): {
  tool?: string;
  args?: Record<string, unknown>;
  final?: string;
} | null {
  if (!content) return null;
  const trimmed = content.trim();
  if (!trimmed.startsWith("{")) return null;
  try {
    const obj = JSON.parse(trimmed) as Record<string, unknown>;
    if (typeof obj.tool === "string") {
      return {
        tool: obj.tool,
        args: (obj.args && typeof obj.args === "object" ? obj.args : {}) as Record<string, unknown>,
      };
    }
    if (typeof obj.final === "string") {
      return { final: obj.final };
    }
  } catch {
    return null;
  }
  return null;
}

/** Agent execution loop: LLM proposes tool calls, MCP executes them, GUARDIAN vets every effect action. */
export async function runAgent(
  spec: AgentSpec,
  input: string,
  ctx: MissionContext,
  userRequest = input,
  maxSteps = 6,
  depth = 0,
): Promise<AgentResult> {
  await startMcpServers();

  const actions: Action[] = [];
  const trace: TraceEvent[] = [];
  const untrusted: string[] = [];

  const baseTools = toolsFor(spec.tools);
  const tools: ToolDef[] = [...baseTools];

  if (spec.canDelegate && depth < MAX_DELEGATION_DEPTH && delegateHandler) {
    const handler = delegateHandler;
    tools.push({
      name: "delegate",
      server: "fleet",
      description:
        "Delegates a sub-task to a specialist agent (SUIT.HEALTH, EVA-PLANNER, SCIENCE, WEATHER-RAD, MAINTENANCE, or ROBOT.<id>).",
      schema: DelegateSchema,
      effect: false,
      run: async (a: z.infer<typeof DelegateSchema>) => {
        trace.push({
          t: Date.now(),
          agent: spec.name,
          kind: "delegate",
          detail: { to: a.agent, objective: a.objective },
        });
        const sub = await handler(a.agent, a.objective, ctx, userRequest, depth + 1);
        actions.push(...sub.actions);
        trace.push(...sub.trace);
        if (sub.text) untrusted.push(sub.text);
        return {
          agent: a.agent,
          speech: sub.text,
          actions: sub.actions.map((act) => ({
            type: act.type,
            decision: act.verdict?.decision ?? "allow",
            reason: act.verdict?.reason ?? "",
          })),
        };
      },
    } as ToolDef);
  }

  const messages: any[] = [
    {
      role: "system",
      content: `${spec.system}\nReply language: ${ctx.lang}. Numbers must come from tools; never estimate them.`,
    },
    { role: "user", content: input },
  ];

  for (let step = 0; step < maxSteps; step++) {
    const msg = await chat(spec.tier, messages, {
      tools: tools.length ? asOpenAI(tools) : undefined,
    });
    messages.push(msg);

    let toolCalls = msg.tool_calls;

    if (!toolCalls?.length) {
      const fallbackCall = tryParseJsonToolCall(msg.content);
      if (fallbackCall?.final !== undefined) {
        return { text: fallbackCall.final, actions, trace };
      }
      if (fallbackCall?.tool) {
        toolCalls = [
          {
            id: `fallback_${step}`,
            type: "function" as const,
            function: {
              name: fallbackCall.tool,
              arguments: JSON.stringify(fallbackCall.args ?? {}),
            },
          },
        ];
      } else {
        const finalText = (msg.content ?? "").trim();
        if (finalText) {
          trace.push({ t: Date.now(), agent: spec.name, kind: "say", detail: finalText });
        }
        return { text: finalText, actions, trace };
      }
    }

    for (const call of toolCalls) {
      const tool = tools.find((t) => t.name === call.function.name);
      let result: unknown;

      if (!tool) {
        result = { error: "Tool not permitted for this agent" };
      } else {
        let rawArgs: unknown = {};
        let parseErr: string | null = null;
        try {
          rawArgs = JSON.parse(call.function.arguments || "{}");
        } catch {
          parseErr = "Invalid JSON tool arguments";
        }

        if (parseErr) {
          result = { error: parseErr };
        } else {
          const parsed = tool.schema.safeParse(rawArgs);
          if (!parsed.success) {
            result = { error: parsed.error.issues[0]?.message ?? "Invalid tool arguments" };
          } else if (tool.name === "delegate") {
            result = await tool.run(parsed.data, ctx, spec.name);
          } else {
            result = await missionScope.run({ ctx, caller: spec.name }, () =>
              callTool(tool, parsed.data),
            );
            trace.push({
              t: Date.now(),
              agent: spec.name,
              kind: "tool",
              detail: { tool: tool.name, args: parsed.data },
            });
            if (tool.effect) {
              const action = result as Action;
              action.verdict = await review(action, ctx, userRequest, untrusted);
              trace.push({
                t: Date.now(),
                agent: "GUARDIAN",
                kind: "verdict",
                detail: action,
              });
              if (action.verdict.decision === "allow" || action.verdict.decision === "ask_human") {
                actions.push(action);
              }
              result = { status: action.verdict.decision, reason: action.verdict.reason };
            } else if (tool.server === "knowledge") {
              untrusted.push(JSON.stringify(result));
            }
          }
        }
      }

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  const finalMsg = await chat(spec.tier, [
    ...messages,
    {
      role: "user",
      content: "Provide your concise spoken reply now based on the tool results already gathered.",
    },
  ]);
  const finalText = (finalMsg.content ?? "").trim();
  if (finalText) {
    trace.push({ t: Date.now(), agent: spec.name, kind: "say", detail: finalText });
  }
  return { text: finalText, actions, trace };
}
