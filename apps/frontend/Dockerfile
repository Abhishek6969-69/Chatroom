FROM node:20-alpine

WORKDIR /usr/src/app

# Copy package files
COPY apps/frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY apps/frontend ./

# Build the app
RUN npm run build

# Install serve to run the production build
RUN npm install -g serve

EXPOSE 3000

# Serve the built app
CMD ["serve", "-s", "dist", "-l", "3000"]
