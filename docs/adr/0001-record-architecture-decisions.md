# 1. Record architecture decisions

- Status: Accepted
- Date: 2026-07-27
- Deciders: Mara Ellingsworth, Teodor Vasko, Ines Halvard

## Context

The gateway is the single entry point of the operator console and sits between the identity provider and every
backend service. Decisions about it affect all other teams.

## Decision

We record every decision that shapes the gateway's routes, security model or operation as an architecture decision
record in `docs/adr`, numbered, with status, context, decision and consequences.

## Consequences

- Positive: other teams can see why the gateway behaves as it does; reviews can point at a record.
- Negative: records take time and go stale unless superseded decisions are marked.
