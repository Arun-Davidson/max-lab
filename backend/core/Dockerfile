# ============================================
# Multi-stage Dockerfile for HIRION Clone Backend
# ============================================

# Base stage
FROM node:20-alpine AS base

WORKDIR /app

# Builder stage
FROM base AS builder

RUN apk add --no-cache python3 make g++

COPY package*.json ./
COPY tsconfig.json ./
COPY .sequelizerc.js ./

RUN npm ci

COPY src ./src
COPY scripts ./scripts
COPY keys ./keys

RUN npm run build

# Production stage
FROM base AS production

ENV NODE_ENV=production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/keys ./keys
COPY --from=builder /app/.sequelizerc.js ./
COPY scripts ./scripts

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create necessary directories
RUN mkdir -p /app/uploads /app/logs /app/keys && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/server.js"]
