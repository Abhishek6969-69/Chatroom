FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate || true
EXPOSE 8080
CMD ["node", "src/index.js"]
