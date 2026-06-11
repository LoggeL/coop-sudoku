FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY client/package.json client/package-lock.json ./client/
COPY server/package.json server/package-lock.json ./server/
COPY shared/ ./shared/

# Install dependencies
RUN npm ci --prefix client && npm ci --prefix server

# Copy source
COPY client/ ./client/
COPY server/ ./server/

# Build client (outputs to server/public via vite.config.ts)
RUN npm run build --prefix client

# Build server TypeScript → JavaScript (outputs to dist via tsconfig)
RUN npm run build --prefix server

# Drop devDependencies before copying node_modules into the production image
RUN npm prune --omit=dev --prefix server

# Production stage
FROM node:22-alpine

WORKDIR /app/server

ENV PUBLIC_DIR=/app/server/public

# Copy compiled server + node_modules + built client
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/public ./public
COPY --from=builder /app/server/package.json ./

EXPOSE 3001

CMD ["node", "dist/server/src/index.js"]
