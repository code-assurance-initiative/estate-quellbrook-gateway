# Scripted history

24 commits by fictional authors, rebuilt and verified by `build-history.sh` (see its header). Commits after them are real benchmark maintenance.

## Sprint 1 (2026-07-27 – 2026-08-07, release `v0.1.0`)

| Commit | Date | Author | Subject | Note |
|---|---|---|---|---|
| `ce7309a` | 2026-07-27 | Mara Ellingsworth | chore: Node 22 + TypeScript skeleton with Fastify, lint, format and test tooling |  |
| `23a621a` | 2026-07-28 | Mara Ellingsworth | docs: ADR 0001 and ADR 0002 (a BFF that calls the services with its own identity) |  |
| `68a1d14` | 2026-07-29 | Teodor Vasko | feat: configuration, logging and problem details |  |
| `ac4129e` | 2026-07-30 | Mara Ellingsworth | feat(auth): verify operator tokens and check scopes |  |
| `8fdaa04` | 2026-07-31 | Ines Halvard | feat(upstream): service token and the order service client |  |
| `f3cc6db` | 2026-08-03 | Teodor Vasko | feat: order routes, health probes, security headers and CORS |  |
| `2d26c13` | 2026-08-04 | Ines Halvard | build: container image and Kubernetes manifests with the ingress and authentication proxy |  |
| `b400e4e` | 2026-08-05 | Mara Ellingsworth | ci: format, lint, type-check, test with coverage, audit; CodeQL, release and deploy workflows |  |
| `0db8ed0` | 2026-08-06 | Teodor Vasko | docs: README, architecture with C4 diagrams, upstream contract and catalog entry |  |
| `5e1bd61` | 2026-08-07 | Mara Ellingsworth | release 0.1.0 | tag `v0.1.0` |

## Sprint 2 (2026-08-10 – 2026-08-21, release `v0.2.0`)

| Commit | Date | Author | Subject | Note |
|---|---|---|---|---|
| `6610834` | 2026-08-11 | Ines Halvard | feat(upstream): dispatch service client |  |
| `38ef74e` | 2026-08-12 | Teodor Vasko | feat: cancel orders from the console |  |
| `fb4f4fd` | 2026-08-13 | Mara Ellingsworth | feat: dispatch board routes (board, assignment, starting a route) |  |
| `c755347` | 2026-08-14 | Teodor Vasko | feat: drivers and vehicles available, for the board's route planner | GW-001: this route is registered without the authentication pre-handlers |
| `e8eea97` | 2026-08-18 | Ines Halvard | feat: shipment view joining an order with its delivery |  |
| `e2eb140` | 2026-08-20 | Mara Ellingsworth | docs: dispatch routes and the shipment view; pinned upstream contracts |  |
| `31ed957` | 2026-08-21 | Mara Ellingsworth | release 0.2.0 | tag `v0.2.0` |

## Sprint 3 (2026-08-24 – 2026-09-04, release `v0.3.0`)

| Commit | Date | Author | Subject | Note |
|---|---|---|---|---|
| `781177f` | 2026-08-25 | Ines Halvard | feat(upstream): retry idempotent reads with backoff |  |
| `d45ac40` | 2026-08-26 | Mara Ellingsworth | feat: rate limit per client address; plugin errors answered as problems |  |
| `fb2fb76` | 2026-08-28 | Ines Halvard | chore(upstream): log the failed request with its upstream failures | GW-002: the failure log now carries the outgoing headers, service token included |
| `a72a29c` | 2026-09-03 | Teodor Vasko | feat: forward the console's Idempotency-Key when placing an order |  |
| `3baa863` | 2026-09-03 | Mara Ellingsworth | docs: retries, rate limit and idempotency in the README |  |
| `f9afee4` | 2026-09-04 | Mara Ellingsworth | ci: sign the image's build provenance and verify it before deploying |  |
| `f5fb175` | 2026-09-04 | Mara Ellingsworth | release 0.3.0 | tag `v0.3.0` |
