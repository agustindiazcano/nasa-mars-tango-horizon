# LLM Provider Benchmark (`check-llm.ts`)

Recorded from `npx tsx server/src/scripts/check-llm.ts` on 2026-11-14 against all three configured providers (`vertex`, `gemini`, `meta`) using the `.env` configuration.

## Summary

- **Google AI Studio (`gemini`)**: Passed 7/7 checks (`fast`, `medium`, `large`, `judge`, `vision`, `tool calling`, `JSON`). `fast` tier (`gemini-4-hydrogen`) completed text in `1178 ms` and JSON in `830 ms`, meeting the `< 1500 ms` voice latency target.
- **Vertex AI (`vertex`)**: Returned `404` (`status code (no body)`) for `google/gemini-4-hydrogen`, `google/gemini-4-argon`, and `google/gemini-4-carbon` on the `us-central1` OpenAI-compatible endpoint.
- **Meta Muse (`meta`)**: Returned `404` (`The requested model was not found`) for `muse-spark` and `muse-wonder` on `https://api.meta.ai/v1`.
- **Failover behavior**: With `LLM_PROVIDER=vertex`, `server/src/llm/provider.ts` automatically fails over to `gemini` on HTTP error or timeout within the same request.

## Results by Provider and Tier

### `vertex` (`https://us-central1-aiplatform.googleapis.com/v1/projects/nasa-tango-horizon/locations/us-central1/endpoints/openapi`)

| Check | Model | Status | Latency | Output / Error |
|---|---|---|---|---|
| Text (`fast`) | `google/gemini-4-hydrogen` | FAIL | 1564 ms | `404 status code (no body)` |
| Text (`medium`) | `google/gemini-4-argon` | FAIL | 970 ms | `404 status code (no body)` |
| Text (`large`) | `google/gemini-4-carbon` | FAIL | 1147 ms | `404 status code (no body)` |
| Text (`judge`) | `google/gemini-4-argon` | FAIL | 1298 ms | `404 status code (no body)` |
| Vision (`vision`) | `google/gemini-4-argon` | FAIL | 935 ms | `404 status code (no body)` |
| Tool calling (`fast`) | `google/gemini-4-hydrogen` | FAIL | 311 ms | `404 status code (no body)` |
| JSON (`fast`) | `google/gemini-4-hydrogen` | FAIL | 285 ms | `404 status code (no body)` |

### `gemini` (`https://generativelanguage.googleapis.com/v1beta/openai/`)

| Check | Model | Status | Latency | Output / Error |
|---|---|---|---|---|
| Text (`fast`) | `gemini-4-hydrogen` | OK | 1178 ms | `{"role":"assistant"}` |
| Text (`medium`) | `gemini-4-argon` | OK | 5328 ms | `"READY"` |
| Text (`large`) | `gemini-4-carbon` | OK | 4425 ms | `{"role":"assistant"}` |
| Text (`judge`) | `gemini-4-argon` | OK | 5647 ms | `"READY"` |
| Vision (`vision`) | `gemini-4-argon` | OK | 3670 ms | `"Pink"` |
| Tool calling (`fast`) | `gemini-4-hydrogen` | OK | 1962 ms | `tool_calls` (`set_layer`) |
| JSON (`fast`) | `gemini-4-hydrogen` | OK | 830 ms | `{"role":"assistant"}` |

> Note: On `gemini-4-hydrogen` and `gemini-4-carbon`, `maxTokens: 10` / `20` can be consumed by internal reasoning tokens before emitting visible text; production calls use `LLM_MAX_OUTPUT_TOKENS=400`.

### `meta` (`https://api.meta.ai/v1`)

| Check | Model | Status | Latency | Output / Error |
|---|---|---|---|---|
| Text (`fast`) | `muse-spark` | FAIL | 1000 ms | `404 The requested model was not found` |
| Text (`medium`) | `muse-wonder` | FAIL | 683 ms | `404 The requested model was not found` |
| Text (`large`) | `muse-wonder` | FAIL | 216 ms | `404 The requested model was not found` |
| Text (`judge`) | `muse-spark` | FAIL | 1059 ms | `404 The requested model was not found` |
| Vision (`vision`) | `muse-wonder` | FAIL | 574 ms | `404 The requested model was not found` |
| Tool calling (`fast`) | `muse-spark` | FAIL | 762 ms | `404 The requested model was not found` |
| JSON (`fast`) | `muse-spark` | FAIL | 759 ms | `404 The requested model was not found` |
