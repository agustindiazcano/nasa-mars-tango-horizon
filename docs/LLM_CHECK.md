# LLM Provider & Voice Benchmark (`check-llm.ts`)

Recorded from `npx tsx server/src/scripts/check-llm.ts` on 2026-11-14 against all three configured providers (`vertex`, `gemini`, `meta`) and Google Cloud Text-to-Speech (`voice`).

## Summary

- **Google Cloud Vertex AI (`vertex`, primary — keyless ADC on `nasa-tango-horizon`, `VERTEX_LOCATION=global`)**: Passed **7/7** checks (`fast`, `medium`, `large`, `judge`, `vision`, `tool calling`, `JSON`). `google/gemini-4-hydrogen` completed tool calling in `1496 ms` and JSON in `1374 ms`.
- **Google AI Studio (`gemini`, secondary failover)**: Passed **7/7** checks (`fast`, `medium`, `large`, `judge`, `vision`, `tool calling`, `JSON`). `gemini-4-hydrogen` completed text in `1207 ms` and tool calling in `1290 ms`.
- **Meta Muse (`meta`, backup failover — `https://api.meta.ai/v1`)**: Passed **7/7** checks using the exact model IDs returned by `/v1/models` (`muse-wonder-1.0` for `large`/`medium`/`vision`, `muse-spark-1.3` for `fast`/`judge`). Also available on the account: `muse-ember-1.0`, `muse-voice-transcribe-1.0`, `muse-image-1.0`, `sam-3.1`.
- **Google Cloud Neural Text-to-Speech (`POST /api/tts`)**: Passed **2/2** checks via keyless ADC (`es-US-Journey-D` in `1534 ms`, `en-US-Journey-D` in `1983 ms`).
- **Failover behavior**: With `LLM_PROVIDER=vertex`, `server/src/llm/provider.ts` routes primary traffic to Vertex AI (`locations/global/endpoints/openapi`) and automatically fails over to `gemini` and `meta` on timeout (`4000 ms` on `fast`) or HTTP error within the same request.

## Results by Provider and Tier

### 1. `vertex` (`https://aiplatform.googleapis.com/v1beta1/projects/nasa-tango-horizon/locations/global/endpoints/openapi`)

| Check | Model | Status | Latency | Output |
|---|---|---|---|---|
| Text (`fast`) | `google/gemini-4-hydrogen` | OK | 2111 ms | `"READY"` |
| Text (`medium`) | `google/gemini-4-argon` | OK | 3019 ms | `"READY"` |
| Text (`large`) | `google/gemini-4-carbon` | OK | 3703 ms | `"READY"` |
| Text (`judge`) | `google/gemini-4-argon` | OK | 3921 ms | `"READY"` |
| Vision (`vision`) | `google/gemini-4-argon` | OK | 4108 ms | `"Maroon"` |
| Tool calling (`fast`) | `google/gemini-4-hydrogen` | OK | 1496 ms | `tool_calls: set_layer({"layer":"thermal"})` |
| JSON (`fast`) | `google/gemini-4-hydrogen` | OK | 1374 ms | `{"ok":true}` |

### 2. `gemini` (`https://generativelanguage.googleapis.com/v1beta/openai/`)

| Check | Model | Status | Latency | Output |
|---|---|---|---|---|
| Text (`fast`) | `gemini-4-hydrogen` | OK | 1207 ms | `"READY"` |
| Text (`medium`) | `gemini-4-argon` | OK | 4490 ms | `"READY"` |
| Text (`large`) | `gemini-4-carbon` | OK | 4189 ms | `"READY"` |
| Text (`judge`) | `gemini-4-argon` | OK | 8607 ms | `"READY"` |
| Vision (`vision`) | `gemini-4-argon` | OK | 4821 ms | `"Pink"` |
| Tool calling (`fast`) | `gemini-4-hydrogen` | OK | 1290 ms | `tool_calls: set_layer({"layer":"thermal"})` |
| JSON (`fast`) | `gemini-4-hydrogen` | OK | 1680 ms | `{"ok":true}` |

### 3. `meta` (`https://api.meta.ai/v1`)

| Check | Model | Status | Latency | Output |
|---|---|---|---|---|
| Text (`fast`) | `muse-spark-1.3` | OK | 2165 ms | `"READY"` |
| Text (`medium`) | `muse-wonder-1.0` | OK | 1197 ms | `"READY"` |
| Text (`large`) | `muse-wonder-1.0` | OK | 1690 ms | `"READY"` |
| Text (`judge`) | `muse-spark-1.3` | OK | 1522 ms | `"READY"` |
| Vision (`vision`) | `muse-wonder-1.0` | OK | 1264 ms | `HTTP 200` |
| Tool calling (`fast`) | `muse-spark-1.3` | OK | 1427 ms | `HTTP 200` |
| JSON (`fast`) | `muse-spark-1.3` | OK | 1394 ms | `HTTP 200` |

### 4. Google Cloud Text-to-Speech (`@google-cloud/text-to-speech`)

| Check | Voice | Status | Latency | Output |
|---|---|---|---|---|
| Spanish (`es-US`) | `es-US-Journey-D` | OK | 1534 ms | `12,672 bytes MP3` |
| English (`en-US`) | `en-US-Journey-D` | OK | 1983 ms | `10,272 bytes MP3` |
