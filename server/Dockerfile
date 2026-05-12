# 口算小达人 — 后端 API（生产镜像，不含 devDependencies）
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runner
WORKDIR /app

ARG APP_VERSION=dev
ARG BUILD_SHA=unknown
ENV NODE_ENV=production
ENV APP_VERSION=${APP_VERSION}
ENV BUILD_SHA=${BUILD_SHA}

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1

CMD ["node", "src/app.js"]
