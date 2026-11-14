import { chat, modelFor, providerAvailable } from "../llm/provider.js";
import type { ProviderName } from "../config.js";

const TINY_RED_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function runCheck(name: string, fn: () => Promise<unknown>): Promise<void> {
  const started = Date.now();
  try {
    const res = await fn();
    const elapsed = Date.now() - started;
    console.log(`OK   ${name} ${elapsed} ms`, JSON.stringify(res).slice(0, 160));
  } catch (err: unknown) {
    const elapsed = Date.now() - started;
    const status =
      typeof err === "object" && err !== null && "status" in err
        ? String((err as { status?: unknown }).status ?? "")
        : "";
    const message = err instanceof Error ? err.message : String(err);
    console.log(`FAIL ${name} ${elapsed} ms`, status, message);
  }
}

async function main(): Promise<void> {
  const enabledProviders = (["vertex", "gemini", "meta"] as ProviderName[]).filter(
    providerAvailable
  );

  if (!enabledProviders.length) {
    console.log("No LLM providers enabled in config.");
    return;
  }

  for (const provider of enabledProviders) {
    console.log(`\n=== Provider: ${provider} ===`);
    for (const tier of ["fast", "medium", "large", "judge"] as const) {
      await runCheck(`${provider} text ${tier} (${modelFor(tier, provider)})`, () =>
        chat(
          tier,
          [{ role: "user", content: "Reply with the word READY." }],
          { maxTokens: 120, provider }
        )
      );
    }

    await runCheck(`${provider} vision (${modelFor("vision", provider)})`, () =>
      chat(
        "vision",
        [
          {
            role: "user",
            content: [
              { type: "text", text: "What color is this pixel? One word." },
              { type: "image_url", image_url: { url: TINY_RED_PNG } },
            ],
          },
        ],
        { maxTokens: 120, provider }
      )
    );

    await runCheck(`${provider} tool calling (${modelFor("fast", provider)})`, () =>
      chat(
        "fast",
        [{ role: "user", content: "Open the thermal map." }],
        {
          provider,
          maxTokens: 120,
          tools: [
            {
              type: "function",
              function: {
                name: "set_layer",
                description: "Switch the terrain layer",
                parameters: {
                  type: "object",
                  properties: {
                    layer: {
                      type: "string",
                      enum: ["optical", "slope", "thermal", "radiation"],
                    },
                  },
                  required: ["layer"],
                },
              },
            },
          ],
        }
      )
    );

    await runCheck(`${provider} JSON (${modelFor("fast", provider)})`, () =>
      chat(
        "fast",
        [{ role: "user", content: 'Return JSON {"ok":true}' }],
        { json: true, maxTokens: 120, provider }
      )
    );
  }
}

await main();
