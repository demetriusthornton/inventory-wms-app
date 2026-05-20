---
name: multi-worktree-project-snapshot
description: Workflow command scaffold for multi-worktree-project-snapshot in inventory-wms-app.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /multi-worktree-project-snapshot

Use this workflow when working on **multi-worktree-project-snapshot** in `inventory-wms-app`.

## Goal

Creates or updates a full project snapshot across multiple git worktrees, including code, configuration, documentation, and scripts.

## Common Files

- `.claude/worktrees/*/src/*`
- `.claude/worktrees/*/*.md`
- `.claude/worktrees/*/firebase.json`
- `.claude/worktrees/*/functions/*`
- `.claude/worktrees/*/tsconfig*.json`
- `.claude/worktrees/*/package*.json`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Copy or update all relevant files (code, config, docs, scripts) into each .claude/worktrees/<worktree-name>/ directory
- Update root-level files as needed to match worktree changes
- Synchronize documentation and architectural pattern files across worktrees
- Update shared files such as package.json, tsconfig, and firebase configs

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.