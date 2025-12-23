FROM node:20-alpine
WORKDIR /usr/src/app

# Copy root dependencies
COPY package*.json ./

# Copy all package.json files
COPY apps/worker/package*.json ./apps/worker/
COPY apps/prisma/package*.json ./apps/prisma/

# Install dependencies
RUN cd apps/worker && npm install
RUN cd apps/prisma && npm install

# Copy source code
COPY apps/worker ./apps/worker
COPY apps/prisma ./apps/prisma

# Generate Prisma client
RUN cd apps/prisma && npx prisma generate

# Build
RUN cd apps/worker && npm run build

# Copy generated client to dist so compiled code can find it
RUN mkdir -p apps/worker/dist/prisma && cp -r apps/prisma/generated apps/worker/dist/prisma/

# Run with explicit error output
CMD ["node", "--no-warnings=ExperimentalWarning", "apps/worker/dist/worker/src/index.js"]
