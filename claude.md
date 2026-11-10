# Inventory WMS App

Warehouse management system for tracking inventory, purchase orders, and stock transfers across multiple branches. Built for internal use with Firebase Authentication (email verification required).

## Tech Stack

- **Frontend:** React 18, TypeScript 5, Vite 6
- **Styling:** Tailwind CSS 3 + CSS custom properties for light/dark theming
- **Backend:** Firebase (Auth, Cloud Firestore, Cloud Functions, Hosting)
- **Cloud Functions:** Node.js 18, firebase-functions 4.5, firebase-admin 12
- **Testing:** Vitest

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run preview` | Preview production build |

Cloud Functions (run from `functions/`):

| Command | Description |
|---------|-------------|
| `npm run build` | Compile TypeScript |
| `npm run serve` | Build + start Firebase emulator |
| `npm run deploy` | Deploy to Firebase |

## Project Structure

```
src/
  App.tsx              Main component — all pages, modals, CRUD handlers (~3950 lines)
  AuthPage.tsx         Login/registration with email verification
  main.tsx             Entry point
  types.ts             Shared TypeScript interfaces (Warehouse, InventoryItem, PurchaseOrder, Transfer, ActivityLog)
  index.css            CSS custom properties for theming (light/dark)
  components/          Reusable UI: DataTable, Modal, MessageBox, LoadingSpinner
  features/            Feature-scoped components (e.g., features/transfers/)
  hooks/               Custom hooks (useCollection for real-time Firestore subscriptions)
  utils/               Helpers (UPC lookup, CSV parsing, image sanitization, auth errors)
functions/
  src/index.ts         Cloud Function for secure UPC lookups (server-side API keys)
firestore.rules        Security rules — deny-by-default, requires email verification
```

## Key Architecture Decisions

- **No router library** — state-based page switching via `PageKey` type in [App.tsx:39-45](src/App.tsx#L39-L45)
- **No state management library** — React hooks (`useState`, `useMemo`, `useCallback`) + real-time Firestore subscriptions via [useCollection](src/hooks/useCollection.ts)
- **No form library** — individual `useState` per field with inline validation
- **All data mutations** must be followed by a `logActivity()` call for audit trail
- **Firestore path structure:** `artifacts/{appId}/shared/global/{collection}`
- **IDs:** client-generated via `crypto.randomUUID()`
- **Timestamps:** ISO 8601 strings
- **Theming:** CSS custom properties (`var(--bg)`, `var(--fg)`, etc.) with Tailwind arbitrary values — never hardcode colors

## Environment Variables

Copy `.env.example` to `.env.local` (frontend) and `functions/.env.example` to `functions/.env` (Cloud Functions). Key variables:
- `VITE_USE_CLOUD_FUNCTIONS` — `true` for production (routes UPC lookups through Cloud Functions)
- `VITE_ALLOWED_EMAIL_DOMAIN` — restrict registration to a specific email domain
- API keys: `VITE_GOUPC_API_KEY`, `VITE_UPCITEMDB_KEY` (dev only; production uses Cloud Functions env)

## Firestore Collections

All under `artifacts/{appId}/shared/global/`:
- `warehouses` — branch/warehouse locations
- `inventory` — items in stock (filtered by `assignedBranchId`)
- `purchaseOrders` — active purchase orders
- `poHistory` — completed/cancelled POs
- `moves` — stock transfer records
- `activityHistory` — audit log of all mutations

## Additional Documentation

Check these files when working on relevant areas:

| File | When to check |
|------|---------------|
| [.claude/docs/architectural_patterns.md](.claude/docs/architectural_patterns.md) | Adding features, modifying CRUD operations, understanding conventions (modal patterns, DataTable usage, activity logging, form state, theming, Cloud Functions, error handling) |
