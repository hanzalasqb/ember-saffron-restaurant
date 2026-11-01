# Build context: repository root (the API bundles ../shared)
FROM node:22-alpine AS build
WORKDIR /app
COPY shared ./shared
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci
COPY server ./server
RUN cd server && npm run build

FROM node:22-alpine
WORKDIR /app/server
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/server/dist ./dist
COPY server/drizzle ./drizzle
USER node
EXPOSE 4100
CMD ["node", "dist/index.js"]
