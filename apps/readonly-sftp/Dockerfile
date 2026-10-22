FROM node:24.22.1-alpine AS build
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/readonly-sftp/package.json apps/readonly-sftp/package.json
RUN pnpm install --frozen-lockfile --filter @modernssh-examples/readonly-sftp...
COPY apps/readonly-sftp apps/readonly-sftp
RUN pnpm --filter @modernssh-examples/readonly-sftp build && pnpm deploy --filter @modernssh-examples/readonly-sftp --prod /out

FROM node:24.22.1-alpine
ENV HOST=0.0.0.0 PORT=2223 NODE_ENV=production
WORKDIR /app
COPY --from=build /out ./
COPY --from=build /workspace/apps/readonly-sftp/assets ./assets
EXPOSE 2223
USER node
CMD ["node", "dist/index.js"]
