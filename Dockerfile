FROM node:12.7.0-alpine

LABEL MAINTAINER="soulteary"

COPY ./src /app

WORKDIR /app

RUN npm i --production

ENTRYPOINT [ "npm", "start" ]