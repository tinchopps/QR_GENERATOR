# Multi-stage build: build frontend & backend TypeScript, then run minimal image.

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
# Production runtime
############################
FROM node:${NODE_VERSION} AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    SERVE_STATIC=1 \
    COMMIT_HASH=${COMMIT_HASH}
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

############################
# Optional development image (docker build --target=dev)
############################
FROM base AS dev
ENV NODE_ENV=development
WORKDIR /app
COPY . .
CMD ["npm", "run", "dev"]