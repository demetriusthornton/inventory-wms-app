# Architectural Patterns & Conventions

## 1. Firestore CRUD Operations

All Firestore operations use a shared `basePath` (`artifacts/{appId}/shared/global`) built by `buildBasePath()` in [helpers.ts:91](src/utils/helpers.ts#L91).

**Create/Update:** `setDoc(doc(collection(db, \`${basePath}/{collection}\`), id), data)`
**Partial Update:** `updateDoc(ref, { field: value })`
**Delete:** `deleteDoc(ref)`

IDs are always generated client-side with `crypto.randomUUID()`. Timestamps use ISO 8601 strings via `new Date().toISOString()`.

**Examples:** [App.tsx:221](src/App.tsx#L221) (warehouse create), [App.tsx:857](src/App.tsx#L857) (inventory), [App.tsx:1168](src/App.tsx#L1168) (purchase order)

## 2. Activity Logging

Every data mutation must be followed by a `logActivity()` call. Defined at [App.tsx:368-387](src/App.tsx#L368-L387).

The caller provides `action`, `collection`, optional `docId`, and `summary`. The function auto-fills `id`, `timestamp`, and `userName`. Interface defined at [types.ts:86-94](src/types.ts#L86-L94).

**Action naming convention:** `{entity}_{verb}` in snake_case. Examples:
- `warehouse_create`, `warehouse_update`, `warehouse_delete`, `warehouse_import`
- `inventory_create`, `inventory_update`, `inventory_delete`, `inventory_import`
- `purchase_order_create`, `purchase_order_receive_full`, `purchase_order_cancel`
- `transfer_create`, `transfer_status_update`, `transfer_complete`

Logging failures are caught and logged to console but never block the operation.

## 3. Real-Time Data via useCollection Hook

[useCollection.ts:26-67](src/hooks/useCollection.ts#L26-L67) provides real-time Firestore subscriptions. Returns `{ data: T[], loading: boolean }`.

**Usage pattern:**
```typescript
const { data: warehouses, loading: warehousesLoading } = useCollection<Warehouse>({
  db, basePath, collectionName: "warehouses",
});
```

Supports optional `whereFilters` for server-side filtering. Auto-unsubscribes on unmount. Dependencies use `JSON.stringify(whereFilters)` for comparison.

## 4. Batch Writes for Multi-Document Operations

Use `writeBatch(db)` when multiple documents must be atomically updated (max 500 ops per batch).

**Examples:**
- CSV imports: [App.tsx:940-975](src/App.tsx#L940-L975) (inventory), [App.tsx:1880-1883](src/App.tsx#L1880-L1883) (warehouses)
- PO receive (updates inventory + moves PO to history + deletes active PO): [App.tsx:1194-1265](src/App.tsx#L1194-L1265)
- Transfer completion (decrements source inventory): [App.tsx:1764-1800](src/App.tsx#L1764-L1800)

Always call `logActivity()` after `batch.commit()`, not before.

## 5. Modal State Management

Each modal uses a paired state pattern:
- `useState<boolean>` for open/close
- `useState<Entity | null>` for the editing target (null = create mode)

Declared at [App.tsx:712-744](src/App.tsx#L712-L744). The Modal component ([Modal.tsx:4-10](src/components/Modal.tsx#L4-L10)) accepts `open`, `onClose`, `title`, `children`, optional `footer`, and optional `maxWidthClass`.

**Convention:** Specific handler functions `openForNew()` (clears editing state, opens) and `openForEdit(item)` (sets editing state, opens).

## 6. Form State Pattern

Forms use individual `useState` per field (not a single object). A `useEffect` populates fields when the modal opens with an existing item. A reset function clears all fields.

**Example:** Inventory form at [App.tsx:746-759](src/App.tsx#L746-L759), warehouse form at [App.tsx:185-206](src/App.tsx#L185-L206).

**Validation:** Inline checks before save (e.g., `if (!name.trim()) return;`). No form library used.

## 7. MessageBox Imperative API

[MessageBox.tsx](src/components/MessageBox.tsx) uses `forwardRef` + `useImperativeHandle` to expose:
- `alert(message)` — fire-and-forget notification
- `confirm(message)` — returns `Promise<boolean>`

Single instance created in App via ref at [App.tsx:345](src/App.tsx#L345). Use `confirm()` before destructive operations (deletes, cancellations).

## 8. DataTable Generic Component

[DataTable.tsx](src/components/DataTable.tsx) is the standard for all list views. Key props:
- `columns`: define `key`, `label`, optional `render` function, optional `sortFn`
- `searchFields`: which fields to include in text search
- `filterFields`: dropdown filters with `type: "select"` and `options`
- `actions`: render function for row action buttons
- `expandable` + `renderExpandedRow`: collapsible detail rows
- `children`: header-area action buttons (Create, Import, etc.)

**Feature table pattern:** Wrap DataTable in a feature-specific component under `src/features/{entity}/`. See [TransfersTable.tsx](src/features/transfers/TransfersTable.tsx) — accepts all data and callbacks as props, performs no direct database access.

## 9. CSS Theming with Custom Properties

Light/dark mode uses CSS custom properties defined in [index.css](src/index.css). Dark mode activates by adding `.dark` class to `<body>`.

**Key variable groups:** `--bg`, `--fg`, `--card`, `--border` (layout); `--input-bg`, `--input-fg`, `--input-border` (forms); `--modal-bg`, `--modal-border` (modals); `--row-odd`, `--row-even`, `--row-hover` (tables).

**In components:** Use Tailwind arbitrary values: `bg-[var(--card)]`, `text-[var(--fg)]`. Never hardcode colors except accent `#0ea5e9`.

Dark mode state persists to localStorage (`ui:darkMode`) and toggles the body class at [App.tsx:335-343](src/App.tsx#L335-L343).

## 10. Cloud Functions for Sensitive Operations

External API calls with secrets go through Cloud Functions ([functions/src/index.ts](functions/src/index.ts)). Pattern:
1. Verify `context.auth` exists (authenticated)
2. Verify `context.auth.token.email_verified` (email verified)
3. Validate input
4. Call external APIs with server-side env vars
5. Return normalized result or throw `HttpsError`

Client calls via `httpsCallable()` from Firebase SDK. Toggle between direct API (dev) and Cloud Function (prod) via `VITE_USE_CLOUD_FUNCTIONS` env var — see [helpers.ts:116](src/utils/helpers.ts#L116).

## 11. Navigation (State-Based Routing)

No router library. Navigation uses a `page` state variable of type `PageKey` ([App.tsx:39-45](src/App.tsx#L39-L45)):
`"inventory" | "pos" | "poHistory" | "transfers" | "warehouses" | "activityHistory"`

Each page renders via a `render{Page}Page()` function within App.tsx. Tab buttons in the top nav set the `page` state.

## 12. Error Handling Convention

- Validate inputs before async operations
- Wrap Firestore/API calls in try-catch
- `console.error()` for developer debugging
- `messageBoxRef.current?.alert()` for user-facing errors
- Never rethrow unless critical — fail gracefully
- For non-critical operations (localStorage), silently catch errors

## 13. Adding a New Feature Checklist

1. Add TypeScript interfaces to [types.ts](src/types.ts)
2. Add `useCollection` hook call in App.tsx with the new collection name
3. Add modal state (`modalOpen`, `editing{Entity}`) in App.tsx
4. Implement CRUD handlers wrapping Firestore operations + `logActivity()`
5. Create feature component in `src/features/{entity}/` using DataTable
6. Add page navigation entry to `PageKey` type and nav bar
7. Ensure Firestore security rules cover the new collection path
