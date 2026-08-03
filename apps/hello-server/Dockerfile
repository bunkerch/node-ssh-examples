FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/hello-server/package.json apps/hello-server/package.json
RUN pnpm install --frozen-lockfile --filter @modernssh-examples/hello-server...
COPY apps/hello-server apps/hello-server
RUN pnpm --filter @modernssh-examples/hello-server build && pnpm deploy --filter @modernssh-examples/hello-server --prod /out

FROM node:24-alpine
ENV HOST=0.0.0.0 PORT=2222 NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
EXPOSE 2222
USER node
CMD ["node", "dist/index.js"]
