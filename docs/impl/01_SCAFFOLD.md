# 01. Project scaffold

**Goal:** a repo that builds, runs locally and serves an empty page from a single process.
**Read first:** `NASA_SPACE_APPS_2026_PLAN.md` sections 5.1 and 5.2.
**Plan tasks:** 4.

## Layout

```
nasa-data/
├─ .env / .env.example
├─ package.json            # workspaces: web, server, shared
├─ Dockerfile
├─ shared/                 # types and physics, used by web and server
│  ├─ package.json
│  └─ src/{physics,types,i18n}/
├─ web/                    # Vite + TypeScript + Three.js viewer
│  ├─ index.html           # main screen (helmet view)
│  ├─ remote.html          # phone page
│  ├─ public/data/         # data pipeline output (committed)
│  └─ src/
├─ server/                 # Fastify: static files + /api + /ws
│  └─ src/
├─ tools/                  # Python pipeline and model training scripts
├─ data/                   # raw downloads (gitignored)
└─ docs/
```

## Code

`package.json` (root):

```json
{
  "name": "tango-horizon",
  "private": true,
  "type": "module",
  "workspaces": ["shared", "web", "server"],
  "scripts": {
    "dev": "concurrently -n web,server \"npm -w web run dev\" \"npm -w server run dev\"",
    "build": "npm -w shared run build && npm -w web run build && npm -w server run build",
    "start": "node server/dist/index.js",
    "test": "npm -w shared run test"
  },
  "devDependencies": { "concurrently": "^9.0.0", "typescript": "^5.6.0" }
}
```

`shared/package.json`:

```json
{
  "name": "@th/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc -p .", "test": "vitest run" },
  "devDependencies": { "vitest": "^2.0.0" }
}
```

`web/vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        remote: resolve(__dirname, "remote.html"),
      },
    },
  },
  server: {
    host: true, // permite abrir desde el celular en la LAN
    proxy: {
      "/api": "http://localhost:8080",
      "/ws": { target: "ws://localhost:8080", ws: true },
    },
  },
});
```

`Dockerfile`:

```dockerfile
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY web/package.json web/
COPY server/package.json server/
RUN npm ci
COPY shared shared
COPY web web
COPY server server
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/shared/package.json shared/
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/package.json server/
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/corpus server/corpus
COPY --from=build /app/web/dist web/dist
RUN npm ci --omit=dev
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
```

`.gitignore` (replaces the current one):

```gitignore
.env
data/
node_modules/
dist/
*.bak.md
__pycache__/
```

## Instructions for the coding agent

1. Create the layout. Run `git init` if there is no repo. Do not touch `data/`, `fetch_mars_data.py`, `validate_urls.py` or the root `.md` files.
2. Dependencies: in `web` install `three`, `@types/three`, `qrcode`; in `server` install `fastify`, `@fastify/static`, `@fastify/websocket`, `@fastify/rate-limit`, `openai`, `zod`, `zod-to-json-schema`, `@modelcontextprotocol/sdk`, `@google-cloud/text-to-speech`, `dotenv`, and `tsx` as a dev dependency. Use current stable versions; do not hand-pin versions that may not exist.
3. `web` and `server` import `@th/shared` through the workspace. Use `"module": "NodeNext"` in server and shared, `"moduleResolution": "bundler"` in web.
4. For now `server/src/index.ts` only serves `web/dist` and answers `GET /api/health` with `{ ok: true }`. The rest arrives in guide 05.
5. Create `server/corpus/.gitkeep` so the Dockerfile `COPY` does not fail.
6. The real `.env` is never copied into the image. On Cloud Run, secrets come from Secret Manager (guide 10).
7. **Language rule for the whole codebase:** identifiers, comments, commit messages, docs and default UI strings are in English. Some code blocks in these guides still carry Spanish comments or strings; translate them to English as you copy them. User-facing strings go through the i18n module (guide 14), never hard-coded.

## Acceptance criteria

- `npm install && npm run build` finishes without errors.
- `npm run dev` opens `http://localhost:5173` and `GET /api/health` answers.
- `docker build .` succeeds.
