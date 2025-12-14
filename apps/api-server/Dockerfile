FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate || true
EXPOSE 4000
CMD ["node", "src/index.js"]
