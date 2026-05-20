```markdown
# inventory-wms-app Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill covers the core development conventions and workflows for the `inventory-wms-app` codebase, a TypeScript-based inventory management system. It documents best practices for adding features, managing multi-worktree snapshots, and maintaining comprehensive documentation. The guide also explains coding conventions, testing patterns, and provides ready-to-use commands for common tasks.

---

## Coding Conventions

### File Naming

- **PascalCase** is used for component and page files.
  - Example: `InventoryList.tsx`, `DashboardPage.tsx`

### Import Style

- Both **default** and **named imports** are used, but prefer named imports for clarity.
  ```typescript
  import { InventoryItem } from '../types';
  import InventoryList from './InventoryList';
  ```

### Export Style

- **Named exports** are preferred for modules and utilities.
  ```typescript
  // src/utils/calculateStock.ts
  export function calculateStock(items: InventoryItem[]): number { ... }
  ```

- For React components, use named exports:
  ```typescript
  export function InventoryList(props: Props) { ... }
  ```

### Type Definitions

- All shared types and interfaces are defined in `src/types.ts`.
  ```typescript
  // src/types.ts
  export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
  }
  ```

### Commit Patterns

- Use the `feat` prefix for feature-related commits.
- Commit messages are concise (~58 characters on average).
  - Example: `feat: add activity history page and types`

---

## Workflows

### Add or Update Feature Module

**Trigger:** When adding a new feature or enhancing an existing feature (e.g., dashboard, inventory, activity history).

**Command:** `/add-feature-module`

1. **Create or update feature files:**
   - Add new pages/components in `src/features/` or `src/components/`.
     ```typescript
     // src/features/Inventory/InventoryPage.tsx
     export function InventoryPage() { ... }
     ```
2. **Update types:**
   - Modify `src/types.ts` to add or update relevant types/interfaces.
     ```typescript
     export interface ActivityHistory { ... }
     ```
3. **Register in main app:**
   - Update `src/App.tsx` to add new routes or components.
     ```typescript
     import { InventoryPage } from './features/Inventory/InventoryPage';
     // ...
     <Route path="/inventory" element={<InventoryPage />} />
     ```
4. **(Optional) Add utilities:**
   - Place helper functions in `src/utils/`.
5. **(Optional) Update styling:**
   - Modify `src/index.css` as needed.

---

### Multi-Worktree Project Snapshot

**Trigger:** When synchronizing or initializing multiple project worktrees (branches/environments) with the latest code, configs, and docs.

**Command:** `/sync-worktrees`

1. **Copy/update files:**
   - Sync code, configs, docs, and scripts into each `.claude/worktrees/<worktree-name>/` directory.
2. **Update root-level files:**
   - Ensure root files reflect changes from worktrees.
3. **Synchronize documentation:**
   - Update architectural pattern files and docs across worktrees.
4. **Update shared configs:**
   - Sync `package.json`, `tsconfig`, `firebase.json`, etc.

---

### Documentation and Architecture Update

**Trigger:** When documenting new features, updating architectural patterns, or providing usage instructions.

**Command:** `/update-docs`

1. **Create or update documentation:**
   - Edit `claude.md`, `architectural_patterns.md`, `README.md`, etc.
2. **Archive previous versions:**
   - Move old docs to `.old` files if needed (e.g., `claude.md.old`).
3. **Update todo/task tracking:**
   - Modify `tasks/todo.md` for task management.

---

## Testing Patterns

- **Framework:** [vitest](https://vitest.dev/)
- **Test file pattern:** `*.test.ts`
- **Test location:** Place tests alongside the modules or in a dedicated `__tests__` directory.
  ```typescript
  // src/features/Inventory/InventoryPage.test.ts
  import { describe, it, expect } from 'vitest';
  import { calculateStock } from '../../utils/calculateStock';

  describe('calculateStock', () => {
    it('returns correct total', () => {
      expect(calculateStock([{ quantity: 2 }, { quantity: 3 }])).toBe(5);
    });
  });
  ```

---

## Commands

| Command              | Purpose                                                      |
|----------------------|--------------------------------------------------------------|
| /add-feature-module  | Add or update a feature module (pages, components, types)    |
| /sync-worktrees      | Synchronize or initialize multi-worktree project snapshots   |
| /update-docs         | Update documentation, architectural patterns, or task files  |
```
