# API and simulation service; supports Render's existing server-only context
# and a repository-root context. Vercel builds and serves the frontend.
FROM node:22-alpine
WORKDIR /app
COPY . /source
RUN mkdir -p /app/server && if [ -f /source/server/private.js ]; then cp -R /source/server/. /app/server/; else cp -R /source/. /app/server/; fi
ENV HOST=0.0.0.0
ENV PORT=8788
ENV PRIVATE_DATA_DIR=/data
VOLUME /data
EXPOSE 8788
CMD ["node", "server/private.js"]
