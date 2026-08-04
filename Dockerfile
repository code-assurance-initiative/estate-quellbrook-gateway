# syntax=docker/dockerfile:1
# docker build -t ghcr.io/code-assurance-initiative/quellbrook-gateway .
#
# Base image pinned by digest (the node:22-alpine tag at the last bump); Dependabot proposes the next digest.
# No HEALTHCHECK: the image runs only on Kubernetes, which ignores it; probes live in deploy/k8s/deployment.yaml.
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY tsconfig.json tsconfig.build.json ./
COPY src/ src/
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules/ node_modules/
COPY --from=build /app/dist/ dist/
EXPOSE 8080
# An unprivileged UID above any host account range, by number so the kubelet can verify runAsNonRoot.
USER 10001:10001
CMD ["node", "dist/main.js"]
