# Build the static front end, then serve it with nginx.
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# nginx runs the scripts in this folder at startup: prints the "ready" banner.
COPY --chmod=755 docker/99-ready.sh /docker-entrypoint.d/99-ready.sh
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
