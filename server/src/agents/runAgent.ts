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

/** Max calls per run for probing tools. */
const TOOL_CAPS: Record<string, number> = { get_terrain_at: 3, search_docs: 2 };

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
  const delegatedUnits = new Set<string>();
  const callCounts = new Map<string, number>();
  let hardDenied: string | null = null;

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
      content: `${spec.system}\nReply language: ${ctx.lang}. Numbers must come from tools; never estimate them. The reply is spoken aloud: plain text only, no Markdown and no LaTeX.`,
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
        if (!finalText) {
          // Drop the empty assistant turn so the forced-final prompt below sees tool/user directly.
          messages.pop();
          break;
        }
        trace.push({ t: Date.now(), agent: spec.name, kind: "say", detail: finalText });
        return { text: finalText, actions, trace };
      }
    }

    // Pre-scan: units delegated to ROBOT.<id> in this turn must not also be commanded directly by this agent.
    for (const call of toolCalls) {
      if (call.function.name !== "delegate") continue;
      try {
        const a = JSON.parse(call.function.arguments || "{}") as { agent?: string };
        if (typeof a.agent === "string" && a.agent.startsWith("ROBOT.")) {
          delegatedUnits.add(a.agent.slice("ROBOT.".length));
        }
      } catch {
        /* invalid args are reported per call below */
      }
    }

    // Probing tools are capped per run so an agent cannot loop on them.
    const overCap = new Set<string>();
    for (const call of toolCalls) {
      const cap = TOOL_CAPS[call.function.name];
      if (cap === undefined) continue;
      const n = (callCounts.get(call.function.name) ?? 0) + 1;
      callCounts.set(call.function.name, n);
      if (n > cap) overCap.add(call.id);
    }

    // Independent calls (reads, reviews, delegations) run concurrently; results keep call order.
    const outcomes = await Promise.all(
      toolCalls.map(async (call): Promise<{ result: unknown; action?: Action }> => {
        const tool = tools.find((t) => t.name === call.function.name);
        if (overCap.has(call.id)) {
          return {
            result: { error: `Call limit reached for ${call.function.name}; answer with the data already gathered.` },
          };
        }
        if (!tool) return { result: { error: "Tool not permitted for this agent" } };

        let rawArgs: unknown = {};
        try {
          rawArgs = JSON.parse(call.function.arguments || "{}");
        } catch {
          return { result: { error: "Invalid JSON tool arguments" } };
        }

        const parsed = tool.schema.safeParse(rawArgs);
        if (!parsed.success) {
          return { result: { error: parsed.error.issues[0]?.message ?? "Invalid tool arguments" } };
        }

        if (tool.name === "delegate") {
          return { result: await tool.run(parsed.data, ctx, spec.name) };
        }

        const unitId = (parsed.data as { unit_id?: unknown }).unit_id;
        if (
          tool.effect &&
          (tool.name === "dispatch" || tool.name === "arm_skill" || tool.name === "unit_action") &&
          typeof unitId === "string" &&
          delegatedUnits.has(unitId)
        ) {
          return {
            result: {
              status: "skipped",
              reason: `Order for ${unitId} already delegated to ROBOT.${unitId}`,
            },
          };
        }

        const result = await missionScope.run({ ctx, caller: spec.name }, () =>
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
          action.verdict = await review(action, ctx, userRequest, [...untrusted]);
          trace.push({ t: Date.now(), agent: "GUARDIAN", kind: "verdict", detail: action });
          if (action.verdict.decision === "deny" && action.verdict.by === "rules") {
            hardDenied ??= action.verdict.reason;
          }
          return {
            result: { status: action.verdict.decision, reason: action.verdict.reason },
            action:
              action.verdict.decision === "allow" || action.verdict.decision === "ask_human"
                ? action
                : undefined,
          };
        }
        if (tool.server === "knowledge") untrusted.push(JSON.stringify(result));
        return { result };
      }),
    );

    toolCalls.forEach((call, i) => {
      const { result, action } = outcomes[i];
      if (action) actions.push(action);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    });
  }
  const finalMsg = await chat(spec.tier, [
    ...messages,
    {
      role: "user",
      content: `Provide your concise spoken reply in ${ctx.lang} now based on the tool results already gathered. Never return empty text.`,
    },
  ]);
  let finalText = (finalMsg.content ?? "").trim();
  if (!finalText) {
    // Model stayed silent: report the deterministic outcome when there is one.
    // With nothing done the text stays empty so the caller can escalate or use the offline rules.
    finalText = hardDenied
      ? `Denied: ${hardDenied}`
      : actions.length
        ? `Done: ${actions.map((a) => a.type).join(", ")}`
        : "";
  }
  if (finalText) trace.push({ t: Date.now(), agent: spec.name, kind: "say", detail: finalText });
  return { text: finalText, actions, trace };
}
