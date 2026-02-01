# CLAUDE.md - AI Assistant Guide for Inventory WMS App

## Project Overview

This is **In Stock - IMS**, an inventory and warehouse management system (WMS) built as a single-page React application. The app enables users to manage inventory items, warehouses/branches, purchase orders, and inter-warehouse transfers with full activity tracking.

### Key Features
- **Inventory Management**: Track items with UPC codes, model numbers, stock levels, and images
- **Warehouse/Branch Management**: Define multiple warehouse locations with addresses
- **Purchase Orders**: Create, track, and receive purchase orders from vendors
- **Transfers**: Initiate and track inventory transfers between warehouses
- **Activity History**: Comprehensive audit logging of all actions
- **Dark Mode**: Theme support via CSS custom properties

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.x | UI framework |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Build tool and dev server |
| Firebase | 11.x | Authentication and Firestore database |
| Tailwind CSS | 3.x | Utility-first CSS framework |
| Vitest | 4.x | Unit testing |
| ESLint | 9.x | Code linting |

## Directory Structure

```
inventory-wms-app/
├── src/
│   ├── App.tsx              # Main application component (~3900 lines)
│   ├── AuthPage.tsx         # Login/registration page
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global styles and CSS variables
│   ├── types.ts             # Shared TypeScript interfaces
│   ├── components/          # Reusable UI components
│   │   ├── DataTable.tsx    # Generic data table with search/sort/filter
│   │   ├── Modal.tsx        # Modal dialog wrapper
│   │   ├── MessageBox.tsx   # Toast/notification component
│   │   └── LoadingSpinner.tsx
│   ├── features/            # Feature-specific components
│   │   └── transfers/
│   │       ├── TransfersTable.tsx
│   │       └── TransferTrackingModal.tsx
│   ├── hooks/               # Custom React hooks
│   │   └── useCollection.ts # Firestore collection subscription hook
│   └── utils/               # Utility functions
│       ├── helpers.ts       # General helpers (UPC lookup, CSV parsing)
│       ├── authErrors.ts    # Firebase auth error messages
│       └── authErrors.test.ts
├── public/                  # Static assets
├── .github/workflows/       # CI/CD workflows
│   └── firebase-hosting-pull-request.yml
├── firebase.json            # Firebase hosting configuration
├── vite.config.ts           # Vite configuration
├── tailwind.config.cjs      # Tailwind CSS configuration
├── tsconfig.json            # TypeScript configuration
└── package.json
```

## Important Files

### `src/App.tsx`
The monolithic main component containing:
- Firebase initialization and authentication state
- All page views (inventory, purchase orders, transfers, warehouses, activity history)
- Modal components for CRUD operations
- Navigation and routing logic

### `src/types.ts`
Core TypeScript interfaces:
- `Warehouse` - Branch/location data
- `InventoryItem` - Product information
- `PurchaseOrder` / `PurchaseOrderItem` - PO data structures
- `Transfer` / `TransferLine` - Transfer tracking
- `ActivityLog` - Audit trail entries
- `TransferStatus` - Union type: `"pending" | "in-transit" | "completed" | "cancelled"`

### `src/hooks/useCollection.ts`
Firebase Firestore real-time subscription hook with filtering support.

### `src/utils/helpers.ts`
- `buildBasePath(appId)` - Constructs Firestore document paths
- `parseCsvSimple(text)` - Basic CSV parser for imports
- `lookupProductByUpc(upc)` - UPC barcode lookup via external APIs (Go-UPC, UPCItemDB, OpenFoodFacts)

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (with HMR)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Lint code
npm run lint
```

## Code Conventions

### TypeScript
- Use explicit interfaces for all data structures
- Prefer `interface` over `type` for object shapes
- Use proper generics for reusable components (see `DataTable<T>`)

### React Patterns
- Functional components with hooks
- `useState` for local component state
- `useEffect` for side effects and subscriptions
- `useCallback` and `useMemo` for performance optimization
- `useRef` for DOM references and imperative handles

### Component Structure
```tsx
interface ComponentProps {
  // Props with TypeScript types
}

export const Component: React.FC<ComponentProps> = ({ props }) => {
  // State hooks
  // Effect hooks
  // Event handlers
  // Return JSX
};
```

### Firebase/Firestore
- Data path pattern: `artifacts/{appId}/shared/global/{collection}`
- Use `crypto.randomUUID()` for document IDs
- Always log activities via `logActivity()` function after CRUD operations

### Naming Conventions
- **Files**: PascalCase for components (`DataTable.tsx`), camelCase for utilities (`helpers.ts`)
- **Components**: PascalCase (`AddWarehouseModal`)
- **Functions/Variables**: camelCase (`handleSave`, `defaultWarehouseId`)
- **Interfaces**: PascalCase, descriptive names (`InventoryItem`, `DataTableProps`)
- **CSS Variables**: kebab-case with semantic names (`--input-bg`, `--error-fg`)

## Styling Guidelines

### CSS Variables (Theming)
The app uses CSS custom properties for theming, defined in `src/index.css`:

```css
/* Light theme (default) */
:root {
  --bg: #f8fafc;
  --fg: #0f172a;
  --card: #ffffff;
  --accent: #0ea5e9;
  /* ... */
}

/* Dark theme */
.dark {
  --bg: #0d0d0d;
  --fg: #f8fafc;
  /* ... */
}
```

### Tailwind CSS Usage
- Use Tailwind utilities with CSS variable references: `bg-[var(--card)]`, `text-[var(--fg)]`
- Common color classes are overridden for theme support
- Responsive prefixes: `sm:`, mobile-first approach

### Button Styles
```tsx
// Primary action (blue)
className="px-4 py-2 rounded-md bg-[#0ea5e9] text-white hover:bg-[#0284c7]"

// Danger action (red)
className="px-4 py-2 rounded-md bg-[#dc2626] text-white hover:bg-[#b91c1c]"

// Outline/secondary
className="btn-outline px-2 py-1 rounded-md border border-slate-300 text-xs"
```

## Testing

Tests use **Vitest** and are co-located with source files (`.test.ts` suffix).

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch
```

Example test pattern (see `src/utils/authErrors.test.ts`):
```typescript
import { describe, expect, it } from "vitest";

describe("functionName", () => {
  it("describes expected behavior", () => {
    expect(result).toBe(expected);
  });
});
```

## Deployment

### Firebase Hosting
- Production builds deploy to Firebase Hosting
- Preview deployments are created automatically on pull requests
- Build output directory: `dist/`

### CI/CD Pipeline
Pull requests trigger:
1. `npm run build` - Compiles TypeScript and bundles with Vite
2. Firebase preview deployment via GitHub Actions

### Environment Variables
- `VITE_GO_UPC_KEY` or `VITE_GOUPC_API_KEY` - API key for Go-UPC product lookups (optional)

## Authentication

- Uses Firebase Authentication with email/password
- Email verification required before login
- Registration restricted to `@bluelinxco.com` email domain
- Auth errors mapped to user-friendly messages in `src/utils/authErrors.ts`

## Database Structure (Firestore)

Collections under `artifacts/{appId}/shared/global/`:
- `warehouses` - Branch/warehouse documents
- `inventory` - Inventory item documents
- `purchaseOrders` - Purchase order documents
- `moves` - Transfer documents
- `activityHistory` - Activity log documents

## Common Tasks for AI Assistants

### Adding a New Feature
1. Define interfaces in `src/types.ts` if needed
2. Add state and handlers in `src/App.tsx`
3. Create reusable components in `src/components/` if applicable
4. Add Firestore collection subscription using `useCollection` hook
5. Implement activity logging for audit trail

### Creating a New Component
1. Create file in appropriate directory (`src/components/` or `src/features/`)
2. Export named component with typed props interface
3. Use CSS variables for theme compatibility
4. Follow existing patterns for consistency

### Modifying the DataTable
The `DataTable` component is highly configurable:
- `columns` - Define visible columns with optional custom render functions
- `searchFields` - Fields to include in search
- `filterFields` - Dropdown filters
- `actions` - Row-level action buttons
- `expandable` / `renderExpandedRow` - Expandable row content

### Adding Tests
1. Create `*.test.ts` file alongside the source file
2. Import from `vitest`
3. Use `describe`/`it`/`expect` pattern
4. Run with `npm run test`

## Known Patterns to Follow

1. **Activity Logging**: Always call `logActivity()` after database mutations
2. **Error Handling**: Wrap async operations in try/catch, display user-friendly messages
3. **Loading States**: Use boolean state for loading indicators during async operations
4. **Form Validation**: Validate required fields before submission
5. **Modal Pattern**: Use the `Modal` component wrapper for all dialogs
6. **ID Generation**: Use `crypto.randomUUID()` for new document IDs

## Potential Improvements

- Extract modal components from `App.tsx` into separate files
- Add more comprehensive test coverage
- Implement proper routing (React Router)
- Add form validation library
- Consider state management solution for complex state (Zustand/Redux)
