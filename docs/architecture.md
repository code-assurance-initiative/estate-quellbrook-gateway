# Architecture — gateway

## Context

```mermaid
C4Context
  title System context — Quellbrook operations platform
  Person(operator, "Operator", "Customer service and dispatch staff")
  System_Boundary(platform, "Quellbrook operations platform") {
    System(web, "Operator console", "estate-quellbrook-web")
    System(gateway, "API gateway / BFF", "this repository")
    System(orders, "Order service", "estate-quellbrook-orders")
    System(dispatch, "Dispatch service", "estate-quellbrook-dispatch")
    System(notifier, "Notifier", "estate-quellbrook-notifier")
  }
  System_Ext(idp, "Identity provider", "OpenID Connect")
  Rel(operator, web, "Uses", "HTTPS")
  Rel(web, gateway, "Calls /api", "HTTPS/JSON")
  Rel(gateway, orders, "Orders", "HTTP/JSON, mesh mTLS")
  Rel(gateway, dispatch, "Dispatch", "HTTP/JSON, mesh mTLS")
  Rel(gateway, idp, "Verifies operators; obtains the service token", "HTTPS")
```

## Containers

```mermaid
C4Container
  title Containers — gateway
  Person(operator, "Operator")
  Container_Ext(proxy, "Authentication proxy", "oauth2-proxy at the ingress", "Signs operators in, forwards their token")
  Container(gateway, "Gateway", "Node.js 22, Fastify", "Operator authentication and authorisation, routing, aggregation")
  System_Ext(orders, "Order service", "HTTP API")
  System_Ext(dispatch, "Dispatch service", "HTTP API")
  System_Ext(idp, "Identity provider", "OpenID Connect")
  Rel(operator, proxy, "https://ops.quellbrook.example/api", "HTTPS")
  Rel(proxy, gateway, "Forwards with Authorization: Bearer", "HTTP over mesh mTLS")
  Rel(gateway, idp, "JWKS; client-credentials token", "HTTPS")
  Rel(gateway, orders, "Service token + X-Quellbrook-Operator", "HTTP/JSON, mesh mTLS")
  Rel(gateway, dispatch, "Service token + X-Quellbrook-Operator", "HTTP/JSON, mesh mTLS")
```

Traffic inside the cluster goes through the Linkerd service mesh (mutual TLS); TLS from the browser terminates at the
ingress controller.

## Inside the gateway

| Folder          | Responsibility                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `src/auth/`     | operator-token verification, `authenticate` and `requireScope` pre-handlers                    |
| `src/routes/`   | the `/api` routes with their JSON schemas, and the probes                                      |
| `src/upstream/` | the service token, the upstream client (timeouts, error mapping) and one typed API per service |
| `src/http/`     | problem-details responses                                                                      |

## Contracts

The gateway implements the upstream services' OpenAPI contracts, pinned in `contracts/upstream/`.
