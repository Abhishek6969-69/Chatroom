FROM node:20-alpine
WORKDIR /usr/src/app

# Copy root dependencies
COPY package*.json ./

# Copy all package.json files (needed for workspaces install)
COPY apps/api-server/package*.json ./apps/api-server/
COPY apps/prisma/package*.json ./apps/prisma/
COPY apps/ws-server/package*.json ./apps/ws-server/
COPY apps/worker/package*.json ./apps/worker/

# Install all workspace dependencies from the root
RUN npm install --workspaces

# Copy source code
COPY apps/ws-server ./apps/ws-server
COPY apps/prisma ./apps/prisma

# Generate Prisma client (with dummy DATABASE_URL for build time)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"
RUN cd apps/prisma && npx prisma generate

# Build
RUN cd apps/ws-server && npm run build

# Copy generated client to dist so compiled code can find it
RUN mkdir -p apps/ws-server/dist/prisma && cp -r apps/prisma/generated apps/ws-server/dist/prisma/

EXPOSE 8080
CMD ["node", "apps/ws-server/dist/index.js"]
