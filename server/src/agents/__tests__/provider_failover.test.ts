import { describe, expect, it } from "vitest";
import { config } from "../../config.js";
import { sanitizeMessagesForProvider, type ChatMessage } from "../../llm/provider.js";

describe("LLM config floors and provider message sanitization", () => {
  it("enforces safe timeout and token floors for reasoning models", () => {
    expect(config.maxTokens).toBeGreaterThanOrEqual(1200);
    expect(config.fastTimeoutMs).toBeGreaterThanOrEqual(6000);
    expect(config.defaultTimeoutMs).toBeGreaterThanOrEqual(15000);
  });

  it("strips Google extra_content from assistant tool_calls when failing over to meta", () => {
    const msgs: ChatMessage[] = [
      { role: "user", content: "Check weather" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call_1",
            type: "function",
            function: { name: "get_environment", arguments: "{}" },
            extra_content: { google: { thought_signature: "abc123" } },
          } as unknown as NonNullable<Extract<ChatMessage, { role: "assistant" }>["tool_calls"]>[number],
        ],
        extra_properties: { google: { traffic_type: "ON_DEMAND" } },
      } as unknown as ChatMessage,
    ];

    const forVertex = sanitizeMessagesForProvider(msgs, "vertex");
    expect(forVertex[1]).toBe(msgs[1]);

    const forMeta = sanitizeMessagesForProvider(msgs, "meta");
    const assistant = forMeta[1] as unknown as Record<string, unknown>;
    expect(assistant.extra_properties).toBeUndefined();
    const tc = (assistant.tool_calls as Array<Record<string, unknown>>)[0];
    expect(tc.extra_content).toBeUndefined();
    expect(tc.id).toBe("call_1");
    expect(tc.function).toEqual({ name: "get_environment", arguments: "{}" });
  });
});
