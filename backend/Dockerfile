# ---- Medik AI backend (prod, OCI) ----
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts && npm cache clean --force

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src
COPY assets ./assets
RUN apk add --no-cache curl \
  && adduser -D -u 10001 medik && chown -R medik:medik /app
USER medik
EXPOSE 4100
ENV PORT=4100
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -sf http://127.0.0.1:4100/api/health >/dev/null || exit 1
CMD ["node", "node_modules/tsx/dist/cli.mjs", "src/index.ts"]
