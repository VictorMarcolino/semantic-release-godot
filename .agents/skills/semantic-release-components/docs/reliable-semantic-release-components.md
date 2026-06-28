---
id: reliable-semantic-release-components
title: Reliable Semantic-release Components
description: Rules for creating semantic-release plugins and components that fail before irreversible release boundaries.
tags:
  - semantic-release
  - typescript
domains:
  - release-automation
---

# Reliable Semantic-release Components

A reliable semantic-release component puts each side effect in the lifecycle
where failure has the intended consequence. Work that must block the Git tag
belongs before the tag boundary.

## Build Rules

Always use TypeScript types from `semantic-release` for hook contexts. Import
types with `import type`, name the concrete context for the hook, and avoid
`any` for `pluginConfig`, `context`, and domain inputs.

Use one domain type per concept. Resolve config/env into a typed input object
once, then pass that object or its typed fields through the implementation.

Throw structured semantic-release errors for expected release failures. The
`fail` hook only receives handled release errors reliably when the thrown error
has semantic-release error shape.

Test lifecycle placement, not only helper functions. A test should fail if
tag-blocking work moves from `prepare` to `publish`.

## Placement Rules

Use `verifyConditions` for static checks: required env vars, binaries, and
option shape.

Use `verifyRelease` when the check needs `nextRelease`, such as version,
channel, or dist-tag validation.

Use `prepare` for side effects that must abort the Git tag if they fail. In this
plugin, container retagging belongs here because a failed retag must stop the
Git release tag.

Use `publish` only when it is acceptable for the Git tag to exist before the
side effect runs.

Use `fail` for best-effort cleanup and notifications. Cleanup should never hide
the original failure.

## Type Pattern

```ts
import type { PrepareContext, VerifyConditionsContext } from "semantic-release";

export interface ComponentOptions {
	readonly registry?: string;
}

export async function verifyConditions(
	pluginConfig: ComponentOptions,
	context: VerifyConditionsContext,
): Promise<void> {
	// Static checks only.
}

export async function prepare(
	pluginConfig: ComponentOptions,
	context: PrepareContext,
): Promise<void> {
	// Side effects that must happen before the Git tag.
}
```

## Checklist

Before shipping a semantic-release component:

1. Map every side effect to the lifecycle where failure has the right result.
2. Use semantic-release TypeScript context types for every exported hook.
3. Use typed domain inputs instead of loose dictionaries.
4. Throw structured errors for expected release failures.
5. Add a test that proves the lifecycle boundary.
6. Document any cleanup as best-effort.

## See also

- [Semantic-release lifecycles](./semantic-release-lifecycles.md)
- [Semantic-release plugin development](https://semantic-release.gitbook.io/semantic-release/developer-guide/plugin)
