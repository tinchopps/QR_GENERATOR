# Multi-stage build: build frontend & backend TypeScript, then run minimal image.
# Last updated: 2025-12-29 - force rebuild

ARG NODE_VERSION=20-alpine
ARG COMMIT_HASH=unknown

############################
# Base builder
############################
FROM node:${NODE_VERSION} AS base
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

RUN npm ci

############################
# Build stage
############################
FROM base AS build
WORKDIR /app
COPY tsconfig.base.json ./
COPY backend/ backend/
COPY frontend/ frontend/
COPY shared/ shared/
RUN npm run build

############################
# Optional development image (docker build --target=dev)
############################
FROM base AS dev
ENV NODE_ENV=development
WORKDIR /app
COPY . .
CMD ["npm", "run", "dev"]

############################
# Production runtime (DEFAULT - last stage)
############################
FROM node:${NODE_VERSION} AS runtime
ARG COMMIT_HASH=unknown
ENV NODE_ENV=production \
    SERVE_STATIC=1 \
    COMMIT_HASH=${COMMIT_HASH}
# NOTE: Do NOT set PORT here - Railway injects its own PORT
WORKDIR /app

# Copy only needed workspace artifacts and node_modules
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/frontend/dist ./frontend/dist
# Also copy frontend to backend/dist/public (where backend looks first)
COPY --from=build /app/frontend/dist ./backend/dist/public
COPY --from=build /app/package.json ./
COPY --from=build /app/backend/package.json ./backend/

EXPOSE 4000
CMD ["node", "backend/dist/server.js"]