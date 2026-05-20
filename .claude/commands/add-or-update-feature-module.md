---
name: add-or-update-feature-module
description: Workflow command scaffold for add-or-update-feature-module in inventory-wms-app.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-or-update-feature-module

Use this workflow when working on **add-or-update-feature-module** in `inventory-wms-app`.

## Goal

Adds or updates a feature module, including new pages, components, utility functions, and updates to types and main app entry.

## Common Files

- `src/App.tsx`
- `src/types.ts`
- `src/features/*/*.tsx`
- `src/components/*.tsx`
- `src/utils/*.ts`
- `src/index.css`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update feature page/component files in src/features/ or src/components/
- Update src/types.ts to add or modify types/interfaces as needed
- Update src/App.tsx to register new routes or components
- Optionally add or update utility functions in src/utils/
- Optionally update styling in src/index.css

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.