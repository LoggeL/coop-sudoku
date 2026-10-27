FROM node:22-alpine AS build
WORKDIR /app

# Install all workspace dependencies in one go (cached until a manifest changes)
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci

COPY . .
RUN npm run build \
 && npm ci --omit=dev --workspace server --include-workspace-root=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3001

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/public ./server/public
COPY --from=build /app/server/package.json ./server/

USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3001/healthz || exit 1
CMD ["node", "server/dist/index.js"]
