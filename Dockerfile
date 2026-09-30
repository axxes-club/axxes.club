# axxes.club on Cloud Run: the Express server Vercel wraps with @vercel/node.
FROM node:24-slim
WORKDIR /app
COPY . .
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
  && rm -f .env .env.* && chown -R node:node /app
ENV NODE_ENV=production PORT=8080
USER node
EXPOSE 8080
CMD ["sh", "-c", "if [ -f /secrets/env ]; then exec node --env-file=/secrets/env server.js; else exec node server.js; fi"]
