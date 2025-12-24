FROM node:20-alpine
WORKDIR /usr/src/app

# Install Prisma deps
COPY apps/prisma/package*.json ./apps/prisma/
RUN cd apps/prisma && npm install

# Install ws-server deps
COPY apps/ws-server/package*.json ./apps/ws-server/
RUN cd apps/ws-server && npm install

# Copy source code
COPY apps/prisma ./apps/prisma
COPY apps/ws-server ./apps/ws-server

# Generate Prisma client (with dummy DATABASE_URL for build time)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"
RUN cd apps/prisma && npx prisma generate

# Build
RUN cd apps/ws-server && npm run build

# Copy generated client to dist so compiled code can find it
RUN mkdir -p apps/ws-server/dist/prisma && cp -r apps/prisma/generated apps/ws-server/dist/prisma/

EXPOSE 8080
CMD ["node", "apps/ws-server/dist/index.js"]
