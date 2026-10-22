FROM node:24.22.1-alpine AS build
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile --filter @modernssh-examples/web...
COPY apps/web apps/web
RUN pnpm --filter @modernssh-examples/web build

FROM node:24.22.1-alpine
ENV HOST=0.0.0.0 PORT=3000 NODE_ENV=production
WORKDIR /app
COPY --from=build /workspace/apps/web/dist/standalone ./
EXPOSE 3000
USER node
CMD ["node", "server.js"]
