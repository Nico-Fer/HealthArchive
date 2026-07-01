---
name: css-first
description: >
  ALWAYS invoke when the user asks to style a component, handle
  responsive layout, add animations, or implement any visual behavior.
  Also invoke when reviewing components that use JS for layout concerns.
  Do not write layout/animation/responsive JS without this skill.
---

## CSS-first rules
- container queries over JS/resize-observer breakpoints
- scroll-driven animations over JS scroll listeners
- content-visibility: auto over JS virtualization for lists under 10,000 items
- :has() selector over JS parent-state toggling
- Tailwind classes from design tokens only; no arbitrary values
- Logical properties (margin-inline, padding-block) over physical ones

## Steps
1. Read the component requirements
2. For each visual behavior, check if CSS handles it natively
3. Only reach for JS when CSS genuinely cannot handle the behavior:
   - Drag-and-drop
   - Complex gesture handling
   - Canvas/WebGL rendering
   - Lists exceeding 10,000 items
4. For each CSS solution, include browser support notes
5. Output as component code with styles
6. If reviewing existing code, output as a unified diff