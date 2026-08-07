# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-08-07

### Added

- Operator authentication (identity-provider tokens) and scope checks; order routes to the order service with the
  gateway's service identity; health probes; security headers and CORS for the console.
- Container image, Kubernetes manifests with ingress and authentication proxy, CI, CodeQL, release and deploy workflows.
