---
name: semantic-release-components
description: Build reliable TypeScript semantic-release plugins and release components. Use when creating or changing lifecycle hooks, plugin config, release side effects, prepare/publish behavior, or failure cleanup.
---

# Semantic-release Components

Use this skill when creating or changing semantic-release plugins in this
repository.

## Required Workflow

1. Read [reliable semantic-release components](docs/reliable-semantic-release-components.md).
2. Read [semantic-release lifecycles](docs/semantic-release-lifecycles.md).
3. Decide the lifecycle by failure boundary, not by the English name of the
   hook.
4. Always use TypeScript types from `semantic-release` for exported hook
   contexts.
5. Keep `pluginConfig`, `context`, and resolved inputs typed. Do not use `any`.
6. Add focused tests for lifecycle placement and failure behavior.

## Lifecycle Rule

If a failure must stop semantic-release from creating and pushing the Git tag,
the work belongs in `verifyConditions`, `verifyRelease`, or `prepare`.

If the Git tag may exist before the work runs, the work can live in `publish`,
`addChannel`, `success`, or `fail`.

## Type Rule

Always import hook contexts with `import type`:

```ts
import type { FailContext, PrepareContext } from "semantic-release";
```

Use the exact context type for the hook being implemented. Do not widen to a
generic object when the runtime gives a semantic-release context.

## Cleanup Rule

Use `fail` only for best-effort cleanup or notification. Never rely on `fail` to
prevent the Git tag; by the time `fail` runs, the failed lifecycle already
decided how far the release got.
