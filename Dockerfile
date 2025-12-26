FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
COPY shared/ ./shared/

# Install dependencies
RUN npm install --prefix client && npm install --prefix server

# Copy source
COPY client/ ./client/
COPY server/ ./server/

# Build client (outputs to server/public via vite.config.ts)
RUN npm run build --prefix client

# Production stage
FROM node:22-alpine

WORKDIR /app

# Copy server with built client and shared
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/package.json ./

WORKDIR /app/server

EXPOSE 3001

CMD ["npx", "ts-node", "src/index.ts"]
