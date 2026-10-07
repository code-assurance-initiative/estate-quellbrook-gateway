# Benchmark: estate-quellbrook-gateway

**Theme.** Quellbrook Freight reference estate, API gateway / BFF: a TypeScript Fastify service that authenticates operators, routes to the order and dispatch services with its own service identity and aggregates a shipment view; owned by the Edge team (steady progress over three sprints).

This repository is part of the scanner benchmark of the Code Assurance Initiative (`code-assurance-initiative/scanner-benchmark`). Its answer key, `benchmark/answer-key.json`, labels the defects that are really there (`must-fire`), sites that look like defects and are not (`must-not-fire`), code certified clean, concepts that do not apply, and expected score ranges. The key is at integration level: it labels the repository as a whole service, at the final commit, plus the one finding that lives only in history. `benchmark/journal.md` records how the repository was made and every scan judged on the way.

## The estate

Quellbrook Freight is a fictional parcel and freight carrier (the name was checked against companies, products and
trademarks; see `scanner-benchmark/docs/ESTATE-NAME.md`). Its operations platform is five repositories, owned by four
teams, that together form one system:

| Repository | What it is | Team | Trajectory over the three sprints |
|---|---|---|---|
| `estate-quellbrook-gateway` | TypeScript API gateway / BFF (Node 22, Fastify): operator authentication, routing, shipment view | Edge | steady |
| `estate-quellbrook-web` | TypeScript React + Vite operator console served by nginx | Edge | steady |
| `estate-quellbrook-orders` | C# order service: Order aggregate, domain events, transactional outbox | Orders | improving |
| `estate-quellbrook-dispatch` | C# dispatch service: consignments, routes, drivers, vehicles | Fleet | falling in sprint 2, partly repaired in sprint 3 |
| `estate-quellbrook-notifier` | C# worker sending e-mail and SMS through abstracted providers | Customer Comms | security incident introduced (sprint 2) and fixed (sprint 3) |

Operators use the web console, which calls the gateway; the gateway calls the order and dispatch services over HTTP
with its own service identity. The order service publishes `orders.*` events to a RabbitMQ topic exchange; dispatch
consumes them and publishes `dispatch.*` events; the notifier consumes both and notifies consignees. Every repository
owns its contracts: producers publish JSON Schemas and an AsyncAPI document under `contracts/`, consumers keep a
pinned copy of the versions they consume under `contracts/consumed/`. Each repository has its own Dockerfile,
Kubernetes manifests (`deploy/k8s/`), GitHub Actions workflows pinned by commit SHA, `docs/architecture.md` with C4
diagrams, ADRs and a `catalog-info.yaml`.

The sprints are two weeks long and identical across the estate: **sprint 1** 2026-07-27 – 2026-08-07 (release
`v0.1.0`), **sprint 2** 2026-08-10 – 2026-08-21 (`v0.2.0`), **sprint 3** 2026-08-24 – 2026-09-04 (`v0.3.0`). The
history is scripted and reproducible (`benchmark/history/`); its authors are fictional (`@example.invalid`).

## The sprint story (for a film director)

The Edge team (Mara Ellingsworth, Teodor Vasko, Ines Halvard) owns the gateway and the web console; it is the
estate's **steady** team.

- **Sprint 1 (v0.1.0).** Fastify gateway with operator authentication (JWT from the identity provider, verified
  against its key set), scope checks, order routes forwarded to the order service with the gateway's own
  client-credentials token, health probes, container image, manifests and CI.
- **Sprint 2 (v0.2.0).** Dispatch board routes (board, assignment, start route) and the shipment view that joins an
  order with its consignment. The "drivers available" route for the board is added without the authentication
  pre-handlers (GW-001).
- **Sprint 3 (v0.3.0).** Retries with backoff for idempotent upstream reads, more context in upstream error logs
  (which is where the service token leaks into the log, GW-002), rate limiting and tests.

The commits are listed in `benchmark/history/README.md`.

## Planted defects (`must-fire`)

| Id | Concept | Site | Why |
|---|---|---|---|
| GW-001 | `missing-authorization` | `src/routes/dispatch-routes.ts:60-70` | GET /api/dispatch/drivers/available was added in sprint 2 for the dispatch board without the operator authentication and scope pre-handlers every other /api route has. The gateway calls the dispatch service with its own service credentials, so the route returns the driver roster (names, licence categories, shift times, vehicles) to any caller that can reach the ingress, with or without a session. |
| GW-002 | `sensitive-data-in-logs` | `src/upstream/upstream-client.ts:80-90` | When an upstream call fails the client logs the outgoing request including its headers. Those headers carry the gateway's own bearer token for the downstream services (Authorization) and the operator id; the logger's redaction list covers only the incoming request's authorization and cookie headers, not this field, so a service token valid for every downstream API reaches the log platform on every upstream error. |

## Traps (`must-not-fire`)

| Id | Concept | Site | Why |
|---|---|---|---|
| TRP-001 | `missing-authorization` | `src/routes/health-routes.ts:5-25` | /healthz and /readyz are the kubelet's liveness and readiness probes; they return a status word and no data, and are anonymous by design. |
| TRP-002 | `sensitive-data-in-logs` | `src/logger.ts:10-16` | The logger configuration names the authorization and cookie headers only to redact them; it is the control, not a leak. |
| TRP-003 | `hardcoded-credential` | `.env.example:1-20` | .env.example documents every variable with a non-secret local default or an empty value; the client secret line is empty. |
| TRP-004 | `hardcoded-credential` | `deploy/k8s/deployment.yaml:50-60` | The gateway's client secret is read from a Kubernetes Secret (secretKeyRef) materialised by an ExternalSecret. |
| TRP-005 | `server-side-request-forgery` | `src/upstream/orders-api.ts:20-30` | The upstream URL is built from a configured base URL and a path whose only caller-supplied part is a route parameter that the route schema restricts to a UUID and that is percent-encoded; the caller cannot choose the host, scheme or port. |

## Certified clean

Every tracked file will carry a `clean` entry, generated from the file list once the code exists: files without a label clean for every concept, labelled files for every finding concept except the labelled ones.

## Not applicable

- `missing-text-alternative` — The gateway is a JSON API; it has no user interface: there are no images.
- `form-control-without-label` — The gateway is a JSON API; it has no user interface: there are no form controls.
- `page-structure-violation` — The gateway is a JSON API; it has no user interface: there are no pages.
- `non-keyboard-accessible-interaction` — The gateway is a JSON API; it has no user interface: there are no interactive markup.
- `invalid-aria-usage` — The gateway is a JSON API; it has no user interface: there are no ARIA attributes.
- `visual-and-motion-safety` — The gateway is a JSON API; it has no user interface: there are no styles or animation.
- `accessibility-checks-in-ci` — The gateway is a JSON API; it has no user interface: there are no user interface to check.
- `alt-text-quality` — The gateway is a JSON API; it has no user interface: there are no images.
- `link-and-button-text-quality` — The gateway is a JSON API; it has no user interface: there are no links or buttons.
- `heading-and-label-text-quality` — The gateway is a JSON API; it has no user interface: there are no headings or labels.
- `sensitive-data-in-browser-storage` — No browser code.
- `versioned-schema-migrations` — The gateway has no database.
- `dual-write-without-outbox` — The gateway owns no data and publishes no messages.

## Score bands

Bands were set from the intent of the code, before any scan, and are wide where a model judges.

| Id | Concept | Band | Why |
|---|---|---|---|
| BND-001 | `high-cyclomatic-complexity` | 80–100 | Small handlers and aggregates; no method above the usual threshold. |
| BND-002 | `high-cognitive-complexity` | 80–100 | Small handlers and aggregates; flat control flow. |
| BND-003 | `duplicated-code` | 80–100 | No copied blocks of note. |
| BND-004 | `test-coverage` | 70–100 | Unit tests for the domain and application layers, integration tests over the HTTP API and persistence. |
| BND-005 | `test-pyramid-distribution` | 40–100 | Unit tests for the clients and helpers, injection tests over every route. |
| BND-006 | `dependencies-not-locked` | 80–100 | package-lock.json committed; CI installs with npm ci. |
| BND-007 | `security-tooling-in-ci` | 60–100 | CodeQL on every pull request, npm audit and signature verification in CI. |
| BND-008 | `vulnerability-disclosure-policy` | 80–100 | SECURITY.md with a private reporting channel and response times. |
| BND-009 | `readme-quality` | 70–100 | README with purpose, build/run, configuration, testing, architecture and ownership sections. |
| BND-010 | `architecture-documentation` | 70–100 | docs/architecture.md with C4 diagrams in Mermaid, plus ADRs. |
| BND-011 | `folder-structure` | 70–100 | src/ and tests/ separation by layer (routes, upstream, auth). |
| BND-012 | `ci-build-and-test-pipeline` | 80–100 | CI builds and tests every push and pull request. |
| BND-013 | `observability` | 60–100 | pino structured logs with request ids, health and readiness probes, traceparent propagation. |
| BND-014 | `deployment-rollback-safety` | 50–100 | Rolling updates by image digest with a rollback step in the deploy workflow. |
| BND-015 | `release-hygiene` | 40–100 | CHANGELOG with every release, package.json version 0.3.0 and tags v0.1.0..v0.3.0. |
| BND-016 | `build-provenance-and-signing` | 40–100 | Release images built by CI with provenance and SBOM attestations. |
| BND-017 | `network-egress-policy` | 60–100 | Default-deny NetworkPolicies with one allowance per real flow. |
| BND-018 | `workload-syscall-confinement` | 10–80 | seccomp RuntimeDefault, all capabilities dropped; no AppArmor or custom profiles. |
| BND-019 | `runtime-threat-detection-and-admission` | 0–40 | Pod Security Admission 'restricted' on the namespace; no runtime threat detection or signed-image admission. |
| BND-020 | `churn-complexity-hotspot` | 70–100 | Six weeks of history; churn lands on small files. |
| BND-021 | `knowledge-concentration` | 30–100 | A team of two or three authors over six weeks; some files are naturally single-author. |
| BND-022 | `knowledge-freshness` | 70–100 | The whole history is recent and the authors are active. |
| BND-023 | `change-coupling` | 50–100 | Co-changes are explicit dependencies or tests changing with their subject. |
| BND-024 | `documentation-quality` | 60–100 | Model-judged. README, architecture overview and ADRs are clear and current. Wide band. |
| BND-025 | `adr-quality` | 60–100 | Model-judged. ADRs carry status, context, decision and two-sided consequences. Wide band. |
| BND-026 | `adr-conformance` | 60–100 | Model-judged. The code follows its ADRs. Wide band. |
| BND-027 | `documentation-accuracy` | 50–100 | Model-judged. README and architecture describe the code as it is. Wide band. |
| BND-028 | `inconsistent-naming` | 60–100 | Model-judged. Consistent domain vocabulary. Wide band. |
| BND-029 | `low-value-comments` | 60–100 | Model-judged. Comments explain why, not what. Wide band. |
| BND-030 | `internal-api-inconsistency` | 60–100 | Model-judged. Endpoints and handlers follow one shape. Wide band. |
| BND-031 | `authorization-enforcement` | 40–95 | Every /api route but one (GW-001) requires an operator token and a scope. |
| BND-032 | `outbound-http-resilience` | 70–100 | Every upstream call has a timeout; idempotent reads retry with backoff. |
| BND-033 | `untyped-javascript-share` | 90–100 | TypeScript throughout, strict mode. |
| BND-034 | `security-response-headers` | 70–100 | helmet defaults plus a strict CSP for JSON responses. |
| BND-035 | `inbound-input-validation` | 60–100 | JSON schema on every route's params, query and body. |
