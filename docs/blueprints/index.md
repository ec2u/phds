---
title: Architecture Blueprints
summary: Design documentation for the EC2U PhD Agreements Tool
description: |
  Index of architecture blueprints covering system design, interaction patterns,
  storage layout, job scheduling, and evolution opportunities.
---

These documents capture the **architectural design decisions** for the EC2U PhD Agreements Tool. They describe how the
system works and why it works that way — not how to build, deploy, or operate it.

For platform setup and operational guides, see [Development](../development/).

# Content Map

| Document                                | Scope                                                          |
|-----------------------------------------|----------------------------------------------------------------|
| [Architecture](architecture.md)         | System topology, application layers, and event-driven store    |
| [Interaction Workflows](workflow.md)    | Client-server sequences: reads, updates, async actions, errors |
| [Storage Layout](storage.md)            | KVS key patterns, caching strategies, and data lifecycle       |
| [Job Scheduling](scheduling.md)         | Two-stage deduplication gate for Forge queue jobs              |
| [Evolution Opportunities](evolution.md) | REST API and real-time event bus beyond Forge                  |

# Companion Diagrams

| File                                 | Format   | Companion                            |
|--------------------------------------|----------|--------------------------------------|
| [architecture.svg](architecture.svg) | SVG      | [Architecture](architecture.md)      |
| [workflow.puml](workflow.puml)       | PlantUML | [Interaction Workflows](workflow.md) |
| [scheduling.puml](scheduling.puml)   | PlantUML | [Job Scheduling](scheduling.md)      |
