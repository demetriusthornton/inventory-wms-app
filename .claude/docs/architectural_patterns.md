# Architectural Patterns

This document describes the architectural patterns, design decisions, and conventions used throughout the codebase.

## 1. Multi-Tenancy Pattern

### Overview
Organization-based data isolation using Firebase path-based security. Each organization has a separate data namespace.

### Implementation
- **Base Path Construction**: [src/utils/helpers.ts:32-37](../src/utils/helpers.ts#L32-L37) - `buildBasePath()` creates org-specific paths
- **Path Usage**: [src/App.tsx:462-499](../src/App.tsx#L462-L499) - All `useCollection` hooks use `basePath` parameter
- **Collection References**: Collections are prefixed with basePath: `${basePath}/warehouses`, `${basePath}/inventory`
- **Document Operations**: [src/App.tsx:212](../src/App.tsx#L212) - All writes use `doc(collection(db, \`${basePath}/warehouses\`), id)`

### Key Files
- [src/App.tsx:351](../src/App.tsx#L351) - `basePath` computed from `appId`
- [src/hooks/useCollection.ts:41](../src/hooks/useCollection.ts#L41) - Hook uses basePath for all queries

## 2. Custom Hooks Pattern

### Overview
Reusable React hooks for Firebase Firestore operations with real-time updates.

### useCollection Hook
**Location**: [src/hooks/useCollection.ts:26-67](../src/hooks/useCollection.ts#L26-L67)

**Purpose**: Real-time data synchronization with Firestore collections

**Features**:
- Generic type support: `useCollection<T>` for type-safe data
- Optional query filters via `whereFilters` parameter
- Automatic subscription cleanup
- Loading state management
- Error handling with console logging

**Usage Examples**:
```typescript
// Basic collection fetch
const { data: warehouses, loading } = useCollection<Warehouse>({
  db, basePath, collectionName: "warehouses"
});

// With filters (not shown in current code but supported)
const { data: items } = useCollection<InventoryItem>({
  db, basePath, collectionName: "inventory",
  whereFilters: [{ field: "assignedBranchId", op: "==", value: warehouseId }]
});
```

**Used In**:
- [src/App.tsx:462-499](../src/App.tsx#L462-L499) - All data collections (warehouses, inventory, POs, transfers, activity logs)

## 3. Component Composition Pattern

### Overview
Reusable, generic UI components with render props and TypeScript generics for flexibility.

### DataTable Component
**Location**: [src/components/DataTable.tsx:33-46](../src/components/DataTable.tsx#L33-L46)

**Features**:
- Generic type parameter: `DataTable<T>`
- Column definitions with custom render functions
- Built-in search and filtering
- Sortable columns
- Expandable rows support
- Actions per row

**Configuration**:
- `columns`: Define what to display - [src/components/DataTable.tsx:4-9](../src/components/DataTable.tsx#L4-L9)
- `searchFields`: Which fields to search
- `filterFields`: Dropdown filters - [src/components/DataTable.tsx:11-16](../src/components/DataTable.tsx#L11-L16)
- `renderExpandedRow`: Optional expandable content

### Modal Component
**Location**: [src/components/Modal.tsx](../src/components/Modal.tsx)

**Pattern**: Container component with slots for title, children, and footer
**Usage**: [src/App.tsx:236-258](../src/App.tsx#L236-L258) - Warehouse modal example

### MessageBox Component
**Location**: [src/components/MessageBox.tsx](../src/components/MessageBox.tsx)

**Pattern**: Imperative API via `useRef` and exposed handle - [src/components/MessageBox.tsx:28](../src/components/MessageBox.tsx#L28)
**Usage**: Centralized user notifications throughout app

## 4. Security Patterns

### Input Sanitization
**Location**: [src/utils/helpers.ts:18-46](../src/utils/helpers.ts#L18-L46)

**Functions**:
- `sanitizeImageUrl()`: Validates and sanitizes image URLs
  - Only allows http/https protocols
  - Validates data URLs with proper MIME types
  - Prevents XSS via javascript: URLs
  - Returns empty string for invalid URLs

### API Key Protection via Cloud Functions
**Problem**: Client-side API keys are visible in JavaScript bundles
**Solution**: [functions/src/index.ts:31-198](../functions/src/index.ts#L31-L198)

**Implementation**:
- `lookupUPC` Cloud Function handles UPC lookups server-side
- API keys stored in Cloud Function environment variables
- Authentication required: [functions/src/index.ts:33-38](../functions/src/index.ts#L33-L38)
- Email verification check: [functions/src/index.ts:41-46](../functions/src/index.ts#L41-L46)
- Input validation: [functions/src/index.ts:51-75](../functions/src/index.ts#L51-L75)
- Three-tier API fallback strategy (Go-UPC → UPCItemDB → OpenFoodFacts)

**Client Usage**: App calls Cloud Function instead of external APIs directly

### Firebase Security
- Firestore rules: [firestore.rules](../firestore.rules)
- Multi-tenancy path-based security enforced at database level

## 5. Type System Architecture

### Centralized Type Definitions
**Location**: [src/types.ts](../src/types.ts)

**Pattern**: All shared interfaces defined in single file
- `Warehouse`: [src/types.ts:3-10](../src/types.ts#L3-L10)
- `InventoryItem`: [src/types.ts:12-27](../src/types.ts#L12-L27)
- `PurchaseOrder`: [src/types.ts:42-54](../src/types.ts#L42-L54)
- `Transfer`: [src/types.ts:72-84](../src/types.ts#L72-L84)
- `ActivityLog`: [src/types.ts:86-94](../src/types.ts#L86-L94)

**Benefits**:
- Single source of truth for data shapes
- Easy to maintain and update
- Shared between components without duplication
- Type-safe data operations

### Generic Components
Pattern used throughout for reusable components:
- `DataTable<T>` - [src/components/DataTable.tsx:33](../src/components/DataTable.tsx#L33)
- `useCollection<T>` - [src/hooks/useCollection.ts:26](../src/hooks/useCollection.ts#L26)

## 6. State Management Pattern

### Overview
React hooks only - no external state management library (Redux, Zustand, etc.)

### Local State
**Pattern**: `useState` for component-local state
**Example**: [src/App.tsx:185-190](../src/App.tsx#L185-L190) - Modal form states

### Shared State
**Pattern**: Props drilling and lifting state up
- Top-level state in App component
- Pass handlers down via props: [src/App.tsx:167-174](../src/App.tsx#L167-L174)

### Server State
**Pattern**: Real-time sync via `useCollection` hook
- No local caching layer needed
- Firestore handles real-time updates
- Component re-renders automatically on data changes

### Derived State
**Pattern**: `useMemo` for computed values
- Used extensively throughout App.tsx for filtering, sorting, transforming data

## 7. Cloud Functions Pattern

### Overview
Firebase Cloud Functions for backend operations requiring secrets or server-side logic.

### Structure
**Location**: [functions/src/index.ts](../functions/src/index.ts)

**Functions**:
1. **Callable Functions**: [functions/src/index.ts:31](../functions/src/index.ts#L31) - `lookupUPC`
   - Used for authenticated operations
   - Return data directly to client
   - Built-in authentication context

2. **HTTP Functions**: [functions/src/index.ts:203](../functions/src/index.ts#L203) - `healthCheck`
   - Standard HTTP endpoints
   - Used for monitoring and webhooks

### Security Patterns in Functions
- Authentication checks: [functions/src/index.ts:33-46](../functions/src/index.ts#L33-L46)
- Input validation: [functions/src/index.ts:51-75](../functions/src/index.ts#L51-L75)
- Structured logging: [functions/src/index.ts:108](../functions/src/index.ts#L108)
- Error handling with proper HTTP status codes

## 8. Monolithic Component Architecture

### Current State
**Main Component**: [src/App.tsx](../src/App.tsx) - 3974 lines

**Structure**:
- Single App component contains most application logic
- Multiple sub-components defined within App.tsx:
  - `AddWarehouseModal` - [src/App.tsx:176-234](../src/App.tsx#L176-L234)
  - Other modals and features inline

**Pros**:
- Simple mental model - everything in one place
- No prop-drilling complexity between files
- Easy to trace data flow

**Cons**:
- Large file size makes navigation harder
- Potential for merge conflicts in team settings
- Harder to unit test individual pieces

**Note**: This is an architectural decision, not necessarily a problem. Many successful apps use this pattern for simplicity.

## 9. Firebase Initialization Pattern

### Overview
Dynamic Firebase configuration loaded from window globals.

### Implementation
**Location**: [src/App.tsx:415-453](../src/App.tsx#L415-L453)

**Pattern**:
1. Read config from `window.__firebase_config`
2. Read app ID from `window.__app_id`
3. Check if Firebase already initialized via `getApps()`
4. Initialize or reuse existing app
5. Set up auth state listener

**Benefits**:
- No hardcoded credentials in source
- Config can be injected at runtime
- Supports multiple environments without rebuilds

**Files**:
- Config injection: [index.html](../index.html) - Likely contains script tags setting globals
- Config parsing: [src/utils/helpers.ts:1-11](../src/utils/helpers.ts#L1-L11) - `jsonSafeParse()`

## 10. Activity Logging Pattern

### Overview
Audit trail for all major operations in the system.

### Implementation
- Collection: `activityHistory` - [src/App.tsx:497-499](../src/App.tsx#L497-L499)
- Type definition: [src/types.ts:86-94](../src/types.ts#L86-L94)

**Log Entry Structure**:
- `timestamp`: ISO string
- `userName`: Who performed the action
- `action`: Type of action (e.g., "warehouse_create", "warehouse_update")
- `collection`: Which collection was affected
- `docId`: Document ID that was modified
- `summary`: Human-readable description

**Usage Example**: [src/App.tsx:222-228](../src/App.tsx#L222-L228) - Logging warehouse creation

**Pattern**: Passed down as callback `onLogActivity` to child components

## Summary

The codebase follows a pragmatic, security-conscious architecture:
- **Simplicity**: React hooks without complex state management
- **Security**: Input validation, sanitization, Cloud Functions for secrets
- **Type Safety**: Centralized types with TypeScript generics
- **Real-time**: Firestore subscriptions via custom hooks
- **Multi-tenancy**: Path-based data isolation
- **Monolithic**: Single large component for simplicity (trade-off accepted)
