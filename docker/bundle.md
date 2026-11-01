# Dokimos, deployable copy

Built by `npm run bundle`. It needs Node.js 22.12 or newer, PostgreSQL 17 and nginx on the host; the full guide is `docs/deployment.md` in the repository.

```sh
npm ci --omit=dev --workspace=@dokimos/api --workspace=@dokimos/shared   # installs production dependencies, including native argon2
cp .env.example .env                                                     # then edit: database, JWT_SECRET
node apps/api/dist/db/migrate.js                                         # applies the migrations
node apps/api/dist/main.js                                               # starts the API on HOST:PORT (default 127.0.0.1:4000)
```

nginx serves the frontend and proxies `/api/`, `/socket.io/` and `/healthz` to the API:

```sh
export NGINX_TRUSTED_PROXY=127.0.0.1 API_UPSTREAM=http://127.0.0.1:4000 WEB_ROOT="$PWD/apps/web/dist"
envsubst '${NGINX_TRUSTED_PROXY} ${API_UPSTREAM} ${WEB_ROOT}' < nginx.conf.template | sudo tee /etc/nginx/conf.d/dokimos.conf
sudo nginx -t && sudo systemctl reload nginx
```

Use an IP address in `API_UPSTREAM`; the template's Docker DNS resolver cannot resolve host names outside Docker. Terminate HTTPS in front of this server and set `NGINX_TRUSTED_PROXY` to that proxy's address.
