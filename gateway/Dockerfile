# L1-gateway/gateway: imagen del gateway NestJS.
FROM node:24-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 8080
CMD ["node", "dist/main.js"]