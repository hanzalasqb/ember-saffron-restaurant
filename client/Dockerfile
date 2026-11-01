# Build context: repository root (the UI imports ../shared)
FROM node:22-alpine AS build
WORKDIR /app
COPY shared ./shared
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci
COPY client ./client
RUN cd client && npm run build

FROM nginx:1.27-alpine
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
