FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
RUN npm ci
COPY tsconfig.base.json ./
COPY shared shared
COPY server server
RUN npm -w shared run build && npm -w server run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/shared/package.json shared/
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/package.json server/
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/corpus server/corpus
RUN npm ci --omit=dev
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
