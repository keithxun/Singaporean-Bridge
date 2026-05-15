FROM node:22-alpine
WORKDIR /app

# Copy root manifest + workspaces so npm install resolves correctly.
COPY package.json package-lock.json .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/

RUN npm install --workspaces --include-workspace-root

# Copy sources
COPY packages/shared packages/shared
COPY apps/server apps/server

# Build the shared package (tsc → dist)
RUN npm run build -w @sgb/shared

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

CMD ["npm", "start", "-w", "@sgb/server"]
