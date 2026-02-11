# CLAUDE.md — Inventory WMS App (In Stock - IMS)

## Project Overview
Warehouse management system for inventory, purchase orders, and inter-warehouse transfers. Built for BlueLinx (`@bluelinxco.com` domain-restricted).

## Tech Stack
- **Framework**: React 18 + TypeScript 5 + Vite 6
- **Backend**: Firebase 11 (Auth + Firestore)
- **Styling**: Tailwind CSS 3 + CSS Variables (dark mode via `.dark` class on `<body>`)
- **Testing**: Vitest
- **Deployment**: Firebase Hosting + GitHub Actions CI

## Commands
```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Type check (tsc -b) + production build
npm run lint      # ESLint (flat config)
npm run test      # Vitest
npm run preview   # Preview production build
firebase deploy   # Deploy to Firebase Hosting
```

## Project Structure
```
src/
├── App.tsx                    # Main app (monolith ~3900 lines, all pages + state)
├── AuthPage.tsx               # Login/registration UI
├── main.tsx                   # Entry point
├── types.ts                   # Shared TypeScript interfaces
├── index.css                  # Global styles + CSS theme variables
├── components/
│   ├── DataTable.tsx          # Generic reusable table (search/filter/sort)
│   ├── Modal.tsx              # Reusable modal
│   ├── MessageBox.tsx         # Alert/confirm dialog (forwardRef + useImperativeHandle)
│   └── LoadingSpinner.tsx
├── hooks/
│   └── useCollection.ts      # Firestore real-time subscription hook
├── features/
│   └── transfers/             # Transfer-specific components
└── utils/
    ├── helpers.ts             # UPC lookup, CSV parsing, utilities
    └── authErrors.ts          # Firebase error code mapping
```

## Architecture & Patterns

### Routing
No React Router. State-based page switching via `PageKey` type:
`"inventory" | "pos" | "poHistory" | "transfers" | "warehouses" | "activityHistory"`

### Data Flow
- Firebase Firestore is source of truth; all collections under `artifacts/{appId}/shared/global/`
- `useCollection` hook subscribes to real-time updates via `onSnapshot`
- Mutations use `setDoc`, `updateDoc`, `deleteDoc`, `writeBatch`
- Activity logging on all data mutations

### Key Collections
`warehouses`, `inventory`, `purchaseOrders`, `poHistory`, `moves` (transfers), `activityHistory`

### Component Patterns
- Functional components only (hooks, no class components)
- Explicit TypeScript interfaces for all props
- Generic components (e.g., `DataTable<T extends Record<string, any>>`)
- `useMemo` / `useCallback` for performance optimization
- `forwardRef` + `useImperativeHandle` for MessageBox

### State Management
- React `useState` for local state
- Firestore listeners for server state
- `localStorage` for theme preference and default warehouse

## Coding Conventions
- **TypeScript strict mode** enabled
- **Naming**: camelCase (functions/variables), PascalCase (components/interfaces)
- **No unused locals/params**: enforced by tsconfig
- **Error handling**: try-catch with `console.error`
- **Firebase config**: global `window.__firebase_config` and `window.__app_id` (set in `index.html`)

## Environment Variables
- `VITE_GO_UPC_KEY` / `VITE_GOUPC_API_KEY` — UPC lookup API key (optional)
- Firebase config is embedded in `index.html` as window globals

## Adding a New Feature/Page
1. Define types in `src/types.ts`
2. Add `useCollection` hook in `App.tsx`
3. Create render method in `App.tsx` (or extract to `src/features/`)
4. Add page key to `PageKey` union type
5. Add nav button in header
