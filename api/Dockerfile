# Built with root repo as context (see docker-compose.yml) — pnpm workspace install
# needs the root manifest plus every sibling package.json before source is copied in.
FROM node:20-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.7.0 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY api/package.json ./api/package.json
COPY api/prisma ./api/prisma
COPY worker/package.json ./worker/package.json
COPY web/package.json ./web/package.json
COPY shared/package.json ./shared/package.json

RUN pnpm install

COPY shared ./shared
COPY api ./api

RUN pnpm --filter ./api exec prisma generate

EXPOSE 4000

CMD ["sh", "-c", "pnpm --filter ./api migrate && pnpm --filter ./api dev"]
