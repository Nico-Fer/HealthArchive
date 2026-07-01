---
name: update-project-memory
description: >
  ALWAYS invoke after completing any task that adds, removes,
  renames, or relocates files, components, routes, API endpoints,
  dependencies, or design tokens. Also invoke when project
  conventions change. Do not skip this after structural changes.
---

## What to maintain
- .claude/skills/PROJECT-STATE.md

## On every update:
1. Read the current PROJECT-STATE.md
2. Diff what changed against what is documented
3. Update ONLY the sections that changed:
   - Components: name, path, client/server, purpose (one line)
   - Routes: path, page component, layout
   - API endpoints: path, method, what it does
   - Dependencies: package, why it is here, version
   - Design tokens: new/removed tokens in Tailwind config
   - Conventions: any pattern that changed
4. Timestamp the update
5. Do NOT rewrite sections that did not change
6. Keep each entry to one line. This is an index, not documentation