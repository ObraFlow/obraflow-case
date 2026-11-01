# Stackport deployment

The live demonstration runs on Stackport from the root [`compose.stackport.yaml`](../compose.stackport.yaml), which builds the images described in the general [deployment guide](../docs/deployment.md) with [`docker/Dockerfile`](../docker/Dockerfile). This folder holds what is specific to that host: its settings, the root `.env` template and the upgrade notes. Nothing here is needed to run the application anywhere else.

```text
Stackport HTTPS -> dokimos:8080 (unprivileged nginx)
                   /                 built frontend + SPA routes
                   /api/*            api:4000 -> dokimos-db:5432
                   /socket.io/       Socket.IO WebSocket upgrades to api:4000
                   /healthz          API + database health
```

Only `dokimos:8080` is an ingress target. There are no host-published ports; PostgreSQL and the API stay on the project's private Compose network. Stackport owns public HTTPS.

## Stackport settings

| Field | Value |
| --- | --- |
| Project | The Stackport project of the Dokimos application |
| Source | The GitHub repository of this application, with a credential if it is private |
| Branch | `feat/obraflow-implementation` |
| Compose file | `compose.stackport.yaml`; select explicitly |
| Domain route | Your FQDN -> service `dokimos`, container port `8080` |
| TLS | Enable HTTPS through Stackport after DNS points to its host |
| Health | Selected HTTPS domain, endpoint `/healthz`, interval 30 seconds |

Set the branch explicitly: the project may have no auto-deploy branch configured. A suggested domain is not an existing route; configure the intended FQDN in Stackport. Do not select `compose.yaml` or `compose.review.yaml`; they publish host ports and use different database ownership.

The file has no hardcoded Compose `name`, container names, or global volume and network names. Stackport's dedicated checkout determines the project identity, so separate projects get separate networks and `<project>_postgres_data` volumes. Internal DNS uses the service names (`dokimos-db`, `api`, `dokimos`).

The one-shot `migrate` and `seed` containers carry the label `com.stackport.health.ignore`, so their stopped containers do not count against the project's running-container health.

## Environment

Create **`.env` at the repository root** in Stackport's environment-file settings before resolving targets or deploying. [`.env.example`](.env.example) lists the variables; it is a template, not the runtime path.

| Variable | Required | Meaning |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | Yes | Database password, shared by PostgreSQL and the three API jobs and services |
| `JWT_SECRET` | Yes | Independent random signing secret, at least 32 characters |
| `JWT_TTL` | No | Token lifetime; default `30m` |
| `NGINX_TRUSTED_PROXY` | For per-client login limits | The actual ingress proxy IP, resolvable hostname or narrowly scoped CIDR; default `127.0.0.1` |
| `SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD` | No | First-run passwords; defaults are the public demonstration credentials |

Compose supplies `PGHOST=dokimos-db`, `PGPORT=5432`, `PGDATABASE=obraflow`, `PGUSER=obraflow` and `PGPASSWORD` from `POSTGRES_PASSWORD`, and never builds a connection URL. Only the API receives the JWT settings. How the API combines these is in the [configuration table](../docs/deployment.md#configuration); how `NGINX_TRUSTED_PROXY` works is in [login rate limit and client IPs](../docs/deployment.md#login-rate-limit-and-client-ips).

**Dotenv parsing still applies.** Stackport's [env-file writer](https://github.com/vtmattedi/Stackport/blob/main/src/services/projectDeploy.ts) writes managed values as literal `KEY=value` lines and Compose then interprets them. `@`, `:`, `/`, `?`, `#` and `%` in an unspaced value need no encoding, but an unquoted or double-quoted dollar expression can expand as a variable. For a password with a literal dollar sign, enter the value in single quotes in the managed `.env` (for example, the illustrative `'example@:/?#%$literal'`); Compose removes the quotes and passes the literal password to both PostgreSQL and the application. Spaces, comment markers, quotes and backslashes need valid dotenv quoting too, so never assume arbitrary editor text arrives unchanged. Do not print resolved Compose configuration or paste credentials into logs.

## Startup and data

The chain is `dokimos-db` healthy, `migrate`, `seed` (`--if-empty`), API healthy, then nginx; only PostgreSQL, the API and nginx stay running. A fresh namespace initializes a new `postgres_data` volume with the configured password. Redeploying within the same namespace keeps the database. A changed `POSTGRES_PASSWORD` does not rotate a role that already exists.

Removing the former hardcoded `name: dokimos` changed the volume namespace for an installation made before that. A new namespace does not adopt or delete `dokimos_postgres_data`; it starts a separate database. Before upgrading an installation whose data must be kept, back up its volume, identify its Compose project, plan the restore into the managed namespace and keep the old data until the restored application is verified. The repository does not migrate volumes or remove obsolete `aaa`, `db` or `web` containers. Never overlap deployments against the same database.

A preserving reseed, if one is needed:

```sh
docker compose -f compose.stackport.yaml run --rm seed node apps/api/dist/db/seed/index.js
```

## Manual verification

Use a throwaway env file outside the repository (for example `/tmp/dokimos-smoke.env` with `POSTGRES_PASSWORD` and `JWT_SECRET`) and a distinct project name. No host ports or development databases are involved:

```sh
docker compose --env-file /tmp/dokimos-smoke.env -f compose.stackport.yaml -p dokimos-stackport-smoke config --quiet
docker compose --env-file /tmp/dokimos-smoke.env -f compose.stackport.yaml -p dokimos-stackport-smoke build
docker compose --env-file /tmp/dokimos-smoke.env -f compose.stackport.yaml -p dokimos-stackport-smoke up -d --wait
docker compose --env-file /tmp/dokimos-smoke.env -f compose.stackport.yaml -p dokimos-stackport-smoke exec dokimos wget -qO- http://127.0.0.1:8080/healthz
```

Then check proxied login and an authenticated read, a same-origin Socket.IO connection, a deep link, the cache and missing-asset behavior and the JSON body-limit error; recreate the jobs to confirm repeat migrations and the seed skip; and confirm the volume survives a stop and start. Use `config --quiet` instead of printing resolved secrets. Remove the smoke stack and its volume only after checking its project name, and never `down --volumes` on data you need.

These are instructions, not a claim that a smoke test passed for this candidate. Remote readiness also depends on host capacity, repository access, the configured env, DNS and TLS.
