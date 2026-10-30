# Build from the project root: docker build -f server/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/src/arrival.js ./src/arrival.js
COPY --from=build /app/src/movement.js ./src/movement.js
ENV HOST=0.0.0.0
ENV PORT=8788
ENV PRIVATE_DATA_DIR=/data
VOLUME /data
EXPOSE 8788
CMD ["node", "server/private.js"]
