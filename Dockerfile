FROM node:20 AS builder

WORKDIR /usr/src/app

COPY package*.json .
RUN npm install

COPY . .

FROM node:20-slim

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/src ./src
COPY --from=builder /usr/src/app/index.js ./

EXPOSE 7000

CMD [ "node", "index.js" ]
