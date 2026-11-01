FROM node:22-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/shared/package.json apps/shared/package.json
RUN npm ci --no-audit --no-fund

FROM dependencies AS shared-build
COPY tsconfig.base.json ./
COPY apps/shared apps/shared
RUN npm run build --workspace @dokimos/shared

# API jobs do not depend on compiling the frontend.
FROM shared-build AS api-build
COPY apps/api apps/api
RUN npm run build --workspace @dokimos/api

FROM shared-build AS web-build
COPY apps/web apps/web
RUN npm run build --workspace @dokimos/web

FROM node:22-bookworm-slim AS api
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/shared/package.json apps/shared/package.json
RUN npm ci --omit=dev --workspace=@dokimos/api --workspace=@dokimos/shared --no-audit --no-fund && npm cache clean --force
COPY --from=shared-build /app/apps/shared/dist apps/shared/dist
COPY --from=api-build /app/apps/api/dist apps/api/dist
USER node
CMD ["node", "apps/api/dist/main.js"]

FROM nginxinc/nginx-unprivileged:stable-alpine AS web-runtime
ENV NGINX_TRUSTED_PROXY=127.0.0.1
ENV API_UPSTREAM=http://api:4000
ENV WEB_ROOT=/usr/share/nginx/html
ENV NGINX_ENVSUBST_FILTER=^(NGINX_TRUSTED_PROXY|API_UPSTREAM|WEB_ROOT)$
COPY docker/nginx.conf /etc/nginx/templates/default.conf.template

FROM web-runtime AS web
COPY --from=web-build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
