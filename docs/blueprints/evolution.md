---
title: Evolution Opportunities
summary: Architectural options beyond the current Forge platform
description: |
  Outlines how the current event-driven architecture maps to a standalone
  deployment with REST/JSON endpoints and a managed real-time event bus.
---

The current architecture (see [Architecture](architecture.md)) is designed around platform-neutral patterns —
resource-centric data model, event-driven store, lockless job deduplication. These patterns are not tied to Forge and
translate directly to a standalone deployment.

# REST API

The Forge `invoke()` transport maps one-to-one to standard REST/JSON endpoints. The page identifier becomes a URL path
segment; each resolver becomes a route handler.

| Endpoint                  | Method   | Description            | Status      | Notes                              |
|---------------------------|----------|------------------------|-------------|------------------------------------|
| `/policies`               | `GET`    | list policy catalogue  | `200`       |                                    |
| `/policies/{source}`      | `GET`    | get/extract policy     | `200`/`202` | triggers extraction on first call  |
| `/policies/{source}?lang` | `GET`    | get/translate policy   | `200`/`202` | triggers translation on first call |
| `/policies`               | `DELETE` | clear policy cache     | `204`       |                                    |
| `/issues`                 | `GET`    | list compliance issues | `200`/`202` | `202` if analysis in progress      |
| `/issues`                 | `POST`   | trigger analysis       | `202`       |                                    |
| `/issues/{issue}`         | `GET`    | get single issue       | `200`       |                                    |
| `/issues/{issue}`         | `PATCH`  | update issue           | `204`       | state, severity, and annotations   |
| `/issues`                 | `DELETE` | clear issues           | `204`       |                                    |

A `202` response includes the current `Activity` stage. Clients receive subsequent updates via the event bus rather than
polling.

# Real-Time Event Bus

Forge Realtime (see [Forge Platform](../development/forge.md#forge-realtime)) provides the current event bus. A
standalone deployment needs an equivalent with the following constraints:

- **Serverless**: no always-running infrastructure to manage
- **Fully managed**: no self-hosted services
- **Direct browser push**: no intermediary adapter layer
- **Decoupled**: survives instance scaling and restarts
- **Event bus only**: usable alongside a primary SQL store

## Candidate: Firestore Real-Time Listeners

Use Firestore as a pure event bus (not primary storage). The server writes events to a dedicated Firestore collection;
browsers subscribe via `onSnapshot()`.

- **Browser push**: native Firestore SDK, no intermediary
- **Serverless**: fully managed, no infrastructure to maintain
- **Decoupled**: survives instance scaling and restarts
- **GCP native**: [Firestore Native mode](https://cloud.google.com/firestore/native/docs) is available in any GCP
  project — just enable the Cloud Firestore API
- **Real-time listeners**: fully supported in Native mode via GCP client libraries
  ([docs](https://cloud.google.com/firestore/docs/query-data/listen))
- **Cleanup**: TTL policies or Cloud Functions to auto-delete old events

### SDK Split

| Side    | Library                   | Role                         |
|---------|---------------------------|------------------------------|
| Server  | `@google-cloud/firestore` | Write events to Firestore    |
| Browser | `@firebase/firestore`     | Subscribe via `onSnapshot()` |

Both connect to the same Firestore Native mode database. The server library uses short-lived gRPC calls (compatible with
serverless). Authentication is automatic via Application Default Credentials.

### Concerns

| Concern      | Detail                                                      |
|--------------|-------------------------------------------------------------|
| Cost         | $0.18/100K reads + $0.18/100K writes, scales with listeners |
| Reconnection | Offline >30 min triggers full query re-read                 |
| Free tier    | 100 concurrent connections                                  |

## Rejected Options

- **SSE / WebSockets**: tied to a running instance, don't survive serverless scaling
- **Cloud Pub/Sub**: backend-only, browsers need always-running WebSocket adapter
- **Redis Pub/Sub (Memorystore)**: backend-only, needs WebSocket proxy, not serverless
- **Eventarc / Cloud Tasks**: server-side only, no browser push
- **Ably / Pusher**: third-party dependency
