FROM node:24-alpine AS build
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/tty-server/package.json apps/tty-server/package.json
RUN pnpm install --frozen-lockfile --filter @modernssh-examples/tty-server...
COPY apps/tty-server apps/tty-server
RUN pnpm --filter @modernssh-examples/tty-server build && pnpm deploy --filter @modernssh-examples/tty-server --prod /out

FROM node:24-alpine
ENV HOST=0.0.0.0 PORT=2225 NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
EXPOSE 2225
USER node
CMD ["node", "dist/index.js"]
