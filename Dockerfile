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

# Build server TypeScript → JavaScript
RUN cd server && npx tsc --outDir dist

# Production stage
FROM node:22-alpine

WORKDIR /app/server

# Copy compiled server + node_modules + built client
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/server/node_modules ./node_modules
COPY --from=builder /app/server/public ./public
COPY --from=builder /app/server/package.json ./
COPY --from=builder /app/shared ./shared

EXPOSE 3001

CMD ["node", "dist/src/index.js"]
