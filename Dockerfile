# first stage: build
FROM node:14-alpine AS builder
WORKDIR /var/www/p2p-expressjs
COPY package.json yarn.lock ./
RUN yarn install
COPY . .
RUN yarn build

# second stage: deploy
FROM node:14-alpine AS deploy
ENV NODE_ENV production
ENV PORT 5000
WORKDIR /var/www/p2p-expressjs
COPY --from=builder /var/www/p2p-expressjs/dist ./dist
COPY package.json yarn.lock ./
RUN yarn install
RUN chmod +x dist/cli.js
RUN apk add dumb-init
CMD ["dumb-init","node","dist/cli.js"]
EXPOSE 5000