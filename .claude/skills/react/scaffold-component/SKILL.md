---
name: scaffold-component
description: >
  ALWAYS invoke when the user asks to create, scaffold, or
  generate a React component. Do not create components
  directly without this skill.
disable-model-invocation: true
argument-hint: "[ComponentName]"
---

## Steps
1. Read REFERENCE.md for naming conventions and directory map
2. Create directory: src/features/[feature]/components/[ComponentName]/
3. Generate:
   - [ComponentName].tsx — typed props interface, functional component
   - [ComponentName].test.tsx — describe block + placeholder test
   - index.ts — barrel export
4. Default to Server Components. Add 'use client' ONLY if
   useState, useEffect, or event handlers are required
5. Use Tailwind classes from design tokens in REFERENCE.md.
   Do not use arbitrary values
6. Run tsc --noEmit to verify compilation
7. Report: files created, props interface, client/server decision + reason