# Deployment

The application is three processes: a static frontend served by nginx, the Fastify API and PostgreSQL. Everything that builds or deploys it lives in a few places:

| Path | Purpose |
| --- | --- |
| [`docker/Dockerfile`](../docker/Dockerfile) | Multi-stage build of the API image and the nginx image |
| [`docker/nginx.conf`](../docker/nginx.conf) | The nginx site: static frontend, API and Socket.IO proxy, login limit |
| [`compose.yaml`](../compose.yaml) | Development database only |
| [`compose.review.yaml`](../compose.review.yaml) | The whole app in Docker on `localhost:8080`, with its own database (`npm run review`) |
| [`compose.stackport.yaml`](../compose.stackport.yaml) | The hosted demo; see [`stackport/`](../stackport/README.md) |
| [`scripts/bundle.mjs`](../scripts/bundle.mjs) | `npm run bundle`: a `dist/` folder for a host without Docker |

Pick one of two deployables. The **Docker images** are the primary one: they pin Node and nginx, run as unprivileged users and need nothing on the host but Docker. The **bundle** is for a host that already has Node.js, PostgreSQL and nginx and where Docker is not wanted.

```text
HTTPS (terminated by you) -> nginx :8080
                             /                 built frontend and SPA routes
                             /api/*            API :4000 -> PostgreSQL
                             /socket.io/       WebSocket upgrades to the API
                             /healthz          API and database health
```

nginx is the single ingress: the browser talks to one origin, so no CORS or separate API domain exists. The API and database are never exposed directly. TLS is the job of whatever sits in front of nginx.

## Configuration

The API reads its settings from the environment (a `.env` in its working directory is loaded when present).

| Variable | Required | Meaning |
| --- | --- | --- |
| `NODE_ENV` | Recommended | `production` makes missing database settings an error and makes seeding opt-in |
| `HOST`, `PORT` | No | Listen address; defaults `127.0.0.1` and `4000`. Use `0.0.0.0` inside a container |
| `DATABASE_URL` | One of the two | A PostgreSQL URL; wins over the discrete fields |
| `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` | One of the two | The discrete form: if any is set, all five are required. No URL encoding is needed in the password |
| `JWT_SECRET` | Yes | Independent random value of at least 32 characters, for example `openssl rand -hex 32` |
| `JWT_TTL` | No | Access-token lifetime; default `30m` |
| `ALLOW_DEMO_SEED` | To seed | Must be `true` for the seed to run in production |
| `SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD` | No | First-run passwords; the defaults are the public demonstration credentials |

An empty or malformed `DATABASE_URL`, incomplete discrete fields or an invalid port fail with a message that never contains the values. Without any connection setting the API uses local development defaults outside production and refuses to start in production.

The public challenge credentials are `admin` / `demo-admin-2026` and `joao`, `amanda`, `carlos`, `beatriz`, `ricardo` / `demo-user-2026`. Custom seed passwords mean the frontend persona buttons no longer work and users sign in by hand. Changing these values, or reseeding, never resets existing credentials.

nginx takes three variables, rendered into the site at startup (nothing else in the file is substituted):

| Variable | Default in the image | Meaning |
| --- | --- | --- |
| `NGINX_TRUSTED_PROXY` | `127.0.0.1` | The address of the proxy in front of nginx, used to find the real client IP (see below) |
| `API_UPSTREAM` | `http://api:4000` | Where the API listens; use an IP address outside Docker |
| `WEB_ROOT` | `/usr/share/nginx/html` | Directory of the built frontend |

## Docker images

The Dockerfile builds the shared contracts first, then compiles the API and the frontend in separate stages. The `api` image holds compiled JavaScript plus production dependencies only; the `web` image is nginx with the static frontend. Both run as unprivileged users. The `web-runtime` stage is nginx with the site template but no frontend.

Startup order in the Compose stacks is database healthy, then `migrate` exits successfully, then `seed` exits successfully, then the API is healthy, then nginx. The API independently refuses to start while migrations are pending, because it never migrates by itself.

The seed runs with `ALLOW_DEMO_SEED=true` and `--if-empty`: on an empty database it creates the demonstration identities, projects, suppliers, memberships, ladders and sample orders; if any user exists it exits without touching anything. Never run overlapping migrations against the same database. A preserving reseed, which keeps credentials, names and progressed orders, is explicit:

```sh
docker compose -f compose.review.yaml run --rm seed node apps/api/dist/db/seed/index.js
```

nginx keeps the request `Host`, port included, for REST and Socket.IO; the API rejects WebSocket origins that differ from it. Writes are never retried by the proxy. The 1 MiB body limit answers with the API's JSON `413 PAYLOAD_TOO_LARGE` envelope. Hashed assets are cacheable for a year and a missing asset is a 404; every other path falls back to `index.html` without caching. `/healthz` checks the API and the database, not just nginx.

On `SIGTERM` the API closes HTTP and Socket.IO connections and its database pool; the Compose files enable an init process and a 30-second shutdown window. Notifications are process-local and best effort ([realtime](architecture/realtime.md)), so run **one** API instance.

## Bundle without Docker

```sh
npm ci
npm run bundle      # npm run build, then assembles dist/
```

`dist/` contains the compiled API, shared contracts and static frontend (`apps/*/dist`, in the same layout as the repository so the workspace link resolves), the root `package.json` and lockfile, `nginx.conf.template`, `.env.example` and a `README.md` with the commands below. It deliberately has no `node_modules`: `argon2` is a native module, so dependencies are installed on the target machine from the lockfile.

```sh
npm ci --omit=dev --workspace=@dokimos/api --workspace=@dokimos/shared
cp .env.example .env            # database, JWT_SECRET
node apps/api/dist/db/migrate.js
node apps/api/dist/db/seed/index.js --if-empty   # optional demonstration data; needs ALLOW_DEMO_SEED=true
node apps/api/dist/main.js
```

Render the nginx site with the same three variables the image uses, and reload nginx:

```sh
export NGINX_TRUSTED_PROXY=127.0.0.1 API_UPSTREAM=http://127.0.0.1:4000 WEB_ROOT="$PWD/apps/web/dist"
envsubst '${NGINX_TRUSTED_PROXY} ${API_UPSTREAM} ${WEB_ROOT}' < nginx.conf.template | sudo tee /etc/nginx/conf.d/dokimos.conf
```

The template is the Docker one, so it keeps a `resolver 127.0.0.11` line; it is harmless while `API_UPSTREAM` is an IP address and cannot resolve host names outside Docker. The site expects to be included inside nginx's `http` block, as `conf.d` files are, because it declares a rate-limit zone. The API process needs a supervisor (systemd, for example) and a loopback `HOST`, since only nginx should reach it.

This path was checked by installing a copy of `dist/` in a separate directory, migrating and seeding a throwaway database, starting the API and rendering the template into a stock nginx container: health, login, SPA routes and the login limit behave as in the images. It has no automated test, and a systemd unit and TLS are the operator's.

## Login rate limit and client IPs

Only `POST /api/v1/auth/login` is limited, by nginx: 30 requests per minute per client IP, with 21 immediate requests and one slot recovered every two seconds. Every attempt counts, whether the credentials are right or not. Excess requests receive JSON `429 RATE_LIMITED` with `Retry-After: 2` and `Cache-Control: no-store`. Other methods, API routes, assets, health checks and WebSocket connections are not limited, and neither the API itself nor the Vite development server has a limiter ([ADR-003](decisions/ADR-003-authentication-authorization.md)).

With no proxy in front of nginx, keep `NGINX_TRUSTED_PROXY=127.0.0.1`: forwarded headers from outside clients are then ignored. Behind a TLS proxy or ingress, set it to that proxy's IP or a narrowly scoped CIDR, and make the proxy append the real client address to `X-Forwarded-For`; nginx walks the chain from the trusted side and takes the last untrusted address. A hostname works but is resolved only when nginx starts. Never trust every source (`0.0.0.0/0`). If the proxy is not trusted, everyone behind it shares its single bucket; users who share a public IP also share one by design.

The limiter state lives in one nginx instance and resets when it is recreated. This is a brake on guessing, not an account lockout or a distributed defence.

## Data and upgrades

Container recreation within the same Compose project keeps the database volume. A different project name starts a separate, empty database and does not adopt or delete the old one. Changing `POSTGRES_PASSWORD` after the database was initialized does not rotate the role's stored password. Back up the volume before an upgrade, never use `down --volumes` on data that matters, and do not use a database reset as an upgrade strategy.

Host-specific instructions, including the Stackport settings and the upgrade notes for its project namespace, are in [`stackport/README.md`](../stackport/README.md).
