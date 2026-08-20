# Quellbrook Gateway

The API gateway and backend-for-frontend of Quellbrook Freight's operations platform. The operator console (web)
calls only this service, under `/api` on the console's host. The gateway verifies the operator's token from the
identity provider, checks the operator's scopes, and calls the order and dispatch services with its own service
identity (OAuth 2.0 client credentials), forwarding the operator's id so the services can record who changed what.

**Owner:** the Edge team (`#team-edge`). **System:** Quellbrook operations platform (see `catalog-info.yaml`).

## Routes

| Method and path                                    | Operator scope                  | Upstream                                                                         |
| -------------------------------------------------- | ------------------------------- | -------------------------------------------------------------------------------- |
| `GET /api/orders?page=&pageSize=`                  | `orders:read`                   | orders `GET /orders`                                                             |
| `GET /api/orders/{orderId}`                        | `orders:read`                   | orders `GET /orders/{id}`                                                        |
| `POST /api/orders`                                 | `orders:write`                  | orders `POST /orders`                                                            |
| `POST /api/orders/{orderId}/cancellation`          | `orders:write`                  | orders `POST /orders/{id}/cancellation`                                          |
| `GET /api/dispatch/board?date=`                    | `dispatch:read`                 | dispatch `GET /routes?date=`                                                     |
| `POST /api/dispatch/consignments/{id}/assignment`  | `dispatch:write`                | dispatch `POST /consignments/{id}/assignment`                                    |
| `POST /api/dispatch/routes/{id}/start`             | `dispatch:write`                | dispatch `POST /routes/{id}/start`                                               |
| `GET /api/dispatch/drivers/available?date=&depot=` | —                               | dispatch `GET /drivers/available`                                                |
| `GET /api/shipments/{orderId}`                     | `orders:read` + `dispatch:read` | orders `GET /orders/{id}` and dispatch `GET /consignments/by-order/{id}`, joined |
| `GET /healthz`, `GET /readyz`                      | none                            | — (probes)                                                                       |

Requests are validated against JSON schemas before any upstream is called. Upstream answers below 500 are relayed as
they are; timeouts become 504 and unavailable or failing upstreams 502, as problem details.

## Build and run

Requires Node.js 22 (`.nvmrc`).

```sh
npm ci
cp .env.example .env   # fill in GATEWAY_CLIENT_SECRET (ask the Edge team for a development client)
npm run build
node --env-file=.env dist/main.js
```

## Configuration

Environment variables, validated at start (`src/config.ts`); `.env.example` lists them all. The client secret comes
from a Kubernetes Secret in production and never from a file in this repository.

## Testing

```sh
npm test               # unit and integration tests
npm run test:coverage  # with coverage thresholds
npm run lint && npm run typecheck
```

Unit tests (`tests/unit`) cover configuration, operator-token verification against an in-process key pair, the
service-token cache and the upstream client. Integration tests (`tests/integration`) build the real Fastify app and
drive it with `inject`, with the upstream services replaced by a recording fake `fetch`; no test touches the network.

## Architecture

See [docs/architecture.md](docs/architecture.md) and [docs/adr](docs/adr). The upstream contracts the gateway
implements are pinned in `contracts/upstream/`.

## Deployment

A published GitHub release builds the image (`.github/workflows/release.yml`); the manual `deploy.yml` workflow rolls
it out to the `quellbrook-edge` namespace (`deploy/k8s/`) and rolls back when the new pods do not become ready.

## Contributing

Open a pull request against `main`. CI (format, lint, types, tests with coverage, npm audit) must be green and CodeQL
must report no new alerts. Every `/api` route needs the `authenticate` and `requireScope` pre-handlers. Record
user-visible changes in `CHANGELOG.md`.

## Licence

MIT; see [LICENSE](LICENSE).
