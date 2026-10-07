# Authoring journal — estate-quellbrook-gateway

## 2026-10-07 — answer key v1.0.0 draft written (key first)

- Part of Phase 4, the reference estate of the fictional carrier Quellbrook Freight (five repositories: gateway, web,
  orders, dispatch, notifier). The estate is designed as a whole first — services, HTTP and message contracts, teams,
  the three-sprint calendar and the story each repository's history tells — and this key is written from that design,
  before any code.
- The key is at integration level: the defects planted at their final sites, the traps a realistic service of this
  kind naturally contains, principled not-applicable entries and score bands set from intent. `clean` entries for
  every tracked file will be generated from `git ls-files` once the tree exists (files without a label: `"*"`).
- Planned line numbers are approximate and will be set to the final code (journalled) before the first scan.
- History plan (as in bench-csharp-maturity-history): the scripted sprint history is appended on top of this
  key-first commit, so the key precedes every line of code in the commit graph; the scripted commits carry fictional
  authors and dates in 2026-07..2026-09, earlier than this commit's real date. Nothing is force-pushed.
- Validated with `python3 -m cai_bench validate`: OK.

## 2026-10-07 — implementation and scripted history (local, not pushed)

- Written forward, sprint by sprint; each release tag's tree was formatted, linted, type-checked and tested (with
  coverage thresholds) before its commits were made. 25 scripted commits, tags `v0.1.0` (25 tests), `v0.2.0` (34),
  `v0.3.0` (40).
- GW-001 as built: sprint 2 (`feat: drivers and vehicles available, for the board's route planner`, 2026-08-14) adds
  `GET /api/dispatch/drivers/available` without the `authenticate`/`requireScope` pre-handlers; it falls back to
  the operator id `anonymous`, calls dispatch with the gateway's service token and relays the roster. Its test sends a
  token, so the gap is not caught. GW-002 as built: sprint 3 (`chore(upstream): log the failed request …`,
  2026-08-28) puts the outgoing request, headers included, into the failure log.
- Found while writing the tests and fixed in the sprint that introduced it: the rate-limit plugin's 429 went through
  the generic error handler and came out as 500 (errors with a client status are now answered as problems with that
  status).
- Key: lines set to the final code; `clean` entries from `git ls-files`. Validated: OK.

## 2026-10-07 — scan iteration 1 (contained, local, before any push) and history packaging

- Contained pass at `ac27287` (tree cleaned of `node_modules/`, `dist/`, `coverage/` first, so the scanned tree equals
  a clone): 7 results. **Both plants missed**, both re-verified: GW-001 (a Fastify route registered without the
  authentication pre-handlers; no rule models route-level authorization in Fastify) and GW-002 (headers with the
  service token logged as a field of a pino object; the personal-data/credential-in-log rule does not read object
  fields — the same blind spot as bench-ts-security-injection PII-001).
- **Valid → repository fixed (scripted history, before the first push):** D36 "No artifact signing" — the release
  built the image with an unsigned BuildKit provenance; a sprint-3 commit (2026-09-04) adds a signed build-provenance
  attestation pushed to the registry and verifies it in the deploy workflow.
- **Noise, code kept:** DS-0026 on a Kubernetes-only image (shape-irrelevant → trap TRP-006), CKV_K8S_35 and KSV-0125
  (opinion, as in the C# services), D41/D42 (opinion / shape-irrelevant), C2 "No named authorization policies — this
  is NOT a claim that endpoints are unprotected" (opinion-not-fact: the scope pre-handlers are the named rule set,
  documented in ADR 0002).
- Each release tag was checked out and run through `npm ci`, format check, lint, type-check and tests with coverage:
  `v0.1.0` 25, `v0.2.0` 34, `v0.3.0` 40 tests, all green.
- `benchmark/history/`: patches and `build-history.sh` (verified into a fresh directory: HEAD and three tags match).
- Key changes: trap TRP-006.
