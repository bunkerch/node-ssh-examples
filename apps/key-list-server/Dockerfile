FROM node:24.22.1-alpine AS build
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/key-list-server/package.json apps/key-list-server/package.json
RUN pnpm install --frozen-lockfile --filter @modernssh-examples/key-list-server...
COPY apps/key-list-server apps/key-list-server
RUN pnpm --filter @modernssh-examples/key-list-server build && pnpm deploy --filter @modernssh-examples/key-list-server --prod /out

FROM node:24.22.1-alpine
ENV HOST=0.0.0.0 PORT=2224 NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
EXPOSE 2224
USER node
CMD ["node", "dist/index.js"]
