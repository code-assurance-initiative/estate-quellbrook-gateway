# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-09-04

### Added

- Reads are retried with backoff when an upstream is briefly unavailable.
- Rate limiting per client address (probes exempt).
- The console's `Idempotency-Key` is forwarded when an order is placed.
- More context in the log when an upstream call fails.
- Release images carry a signed build-provenance attestation, verified before deploying.

## [0.2.0] - 2026-08-21

### Added

- Cancelling orders; the dispatch board (board, assignment, starting a route, available drivers and vehicles).
- The shipment view: an order joined with its delivery.

## [0.1.0] - 2026-08-07

### Added

- Operator authentication (identity-provider tokens) and scope checks; order routes to the order service with the
  gateway's service identity; health probes; security headers and CORS for the console.
- Container image, Kubernetes manifests with ingress and authentication proxy, CI, CodeQL, release and deploy workflows.
