FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/engine/package*.json ./packages/engine/

RUN npm ci --workspaces --include-workspace-root

COPY . .

RUN npm run build -w apps/api && npm run build -w apps/web

EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
