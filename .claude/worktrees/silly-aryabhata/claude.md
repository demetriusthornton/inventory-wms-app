# Inventory WMS App

## What This Is

A warehouse management system (WMS) for tracking inventory, purchase orders, transfers, and warehouse operations. Single-page application with real-time Firebase sync.

## Why This Exists

Multi-warehouse inventory management with real-time tracking, purchase orders, transfers, activity logging, and UPC barcode lookup.

## Tech Stack

- **Frontend**: React 18 + TypeScript 5
- **Build**: Vite 6
- **Backend**: Firebase 11 (Auth + Firestore + Cloud Functions)
- **Styling**: TailwindCSS 3 + PostCSS
- **Testing**: Vitest 4

## Project Structure

### Source (`src/`)
- **[App.tsx](src/App.tsx)** (3974 lines) - Main app component with business logic
- **[types.ts](src/types.ts)** - Centralized TypeScript types
- **[AuthPage.tsx](AuthPage.tsx)** - Auth UI (email/password, Google)

### Features (`src/features/`)
- **transfers/** - Inter-warehouse transfer components

### Components (`src/components/`)
- **[DataTable.tsx](src/components/DataTable.tsx)** - Generic table (search, sort, filter)
- **[Modal.tsx](src/components/Modal.tsx)** - Reusable modal
- **[MessageBox.tsx](src/components/MessageBox.tsx)** - Notifications
- **[LoadingSpinner.tsx](src/components/LoadingSpinner.tsx)** - Loading UI

### Hooks (`src/hooks/`)
- **[useCollection.ts](src/hooks/useCollection.ts)** - Real-time Firestore sync

### Utils (`src/utils/`)
- **[helpers.ts](src/utils/helpers.ts)** - Sanitization, parsing, UPC lookup
- **[authErrors.ts](src/utils/authErrors.ts)** - Auth error handling

### Backend (`functions/`)
- **[index.ts](functions/src/index.ts)** - Cloud Functions (UPC lookup, health check)

### Config
- **[firebase.json](firebase.json)** - Firebase config
- **[firestore.rules](firestore.rules)** - DB security rules
- **[vite.config.ts](vite.config.ts)** - Vite config
- **[tailwind.config.cjs](tailwind.config.cjs)** - Tailwind config
- **tsconfig.json** - TypeScript configs (root, app, node)

## Essential Commands

```bash
npm run dev          # Dev server with HMR
npm run build        # TypeScript check + production build
npm run test         # Run tests with Vitest
npm run lint         # ESLint
npm run preview      # Preview production build
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/` | Application source |
| `src/components/` | Reusable UI components |
| `src/features/` | Feature-specific components |
| `src/hooks/` | Custom React hooks |
| `src/utils/` | Helper functions |
| `functions/` | Cloud Functions (backend) |
| `.claude/docs/` | Additional documentation |
| `tasks/` | Task planning and TODOs |

## Firestore Collections

All namespaced by org: `${basePath}/${collectionName}` where basePath = `organizations/${appId}`

- **warehouses** - Branches/locations
- **inventory** - Current inventory
- **purchaseOrders** - Active POs
- **poHistory** - Completed/deleted POs
- **moves** - Inter-warehouse transfers
- **activityHistory** - Audit logs

## Environment Variables

Create `.env.local` (never commit):
- `VITE_GOUPC_API_KEY` - Go-UPC key (optional, use Cloud Functions)
- `VITE_UPCITEMDB_KEY` - UPCItemDB key (optional, use Cloud Functions)

See [.env.example](.env.example) for reference.

**Production**: Use Cloud Functions with environment variables for API key security.

## Multi-Tenancy

Organization-based data isolation:
- Each org has unique `appId` (e.g., "wms-app-prod")
- All paths include `basePath`: `organizations/${appId}`
- Security via [firestore.rules](firestore.rules)

## Additional Documentation

- **[Architectural Patterns](.claude/docs/architectural_patterns.md)** - Design patterns and conventions
- **[Security Guide](SECURITY.md)** - Security best practices
- **[Cloud Functions Setup](CLOUD_FUNCTIONS_SETUP.md)** - Detailed CF config
- **[Quick Start: Cloud Functions](QUICKSTART_CLOUD_FUNCTIONS.md)** - Fast CF setup

## Working Guidelines

### Before Starting
1. Read relevant files
2. Check [architectural_patterns.md](.claude/docs/architectural_patterns.md)
3. Write plan to [tasks/todo.md](tasks/todo.md)
4. Get user approval

### During Work
- Keep changes simple and minimal
- Impact as little code as possible
- Mark tasks complete as you go
- Provide high-level change summaries

### After Completion
- Add review section to [tasks/todo.md](tasks/todo.md)
- Summarize changes and notes
