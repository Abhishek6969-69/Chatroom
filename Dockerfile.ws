FROM node:20-alpine
WORKDIR /usr/src/app

# Copy root dependencies
COPY package*.json ./

# Copy all package.json files
COPY apps/ws-server/package*.json ./apps/ws-server/
COPY apps/prisma/package*.json ./apps/prisma/

# Install dependencies
RUN cd apps/ws-server && npm install
RUN cd apps/prisma && npm install

# Copy source code
COPY apps/ws-server ./apps/ws-server
COPY apps/prisma ./apps/prisma

# Generate Prisma client
RUN cd apps/prisma && npx prisma generate

# Build
RUN cd apps/ws-server && npm run build

# Copy generated client to dist so compiled code can find it
RUN mkdir -p apps/ws-server/dist/prisma && cp -r apps/prisma/generated apps/ws-server/dist/prisma/

EXPOSE 8080
CMD ["node", "apps/ws-server/dist/index.js"]
