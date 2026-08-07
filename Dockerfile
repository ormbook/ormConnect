# Multi-stage Dockerfile for ormConnect Remote Desktop
# Stage 1: Build Frontend
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

COPY server.js ./
COPY agent.js ./
COPY public ./public
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "server.js"]
