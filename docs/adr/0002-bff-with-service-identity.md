# 2. A backend-for-frontend that calls the services with its own identity

- Status: Accepted
- Date: 2026-07-28
- Deciders: Mara Ellingsworth, Teodor Vasko, Ruth Calloway (Orders), Kasper Nyholt (Fleet)

## Context

The operator console needs data from several services, sometimes combined. Operators sign in at the identity provider
through the ingress's authentication proxy. The backend services should not each have to understand operator roles,
and the console should not call them directly.

## Decision

The gateway is the only backend the console calls. It verifies the operator's token itself (signature, issuer,
audience, expiry) and authorises each route by the operator's scopes; every `/api` route registers the `authenticate`
and `requireScope` pre-handlers. It calls the services with its own access token (client credentials), which holds
the services' scopes, and forwards the operator's id in `X-Quellbrook-Operator`. Upstream clients live in
`src/upstream/` and know nothing about HTTP routing (enforced by the lint configuration).

## Consequences

- Positive: one place decides what an operator may do; the services trust one client; aggregated views (shipment
  status) are composed here without the console knowing the services.
- Negative: the gateway is the authorisation boundary — a route registered without the pre-handlers exposes the
  services' data with the gateway's own rights, so route reviews must check them; the gateway's client secret is a
  high-value credential.
