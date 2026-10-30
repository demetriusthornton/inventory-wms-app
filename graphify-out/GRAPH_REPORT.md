# Graph Report - KIICH-app  (2026-10-29)

## Corpus Check
- 41 files · ~35,232 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 462 nodes · 500 edges · 29 communities (27 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a1bfdb50`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 18 edges
3. `Cloud Functions Setup Guide` - 15 edges
4. `Architectural Patterns & Conventions` - 14 edges
5. `Quick Start: Cloud Functions for Secure UPC Lookup` - 12 edges
6. `Cloud Functions for Inventory WMS` - 12 edges
7. `compilerOptions` - 10 edges
8. `scripts` - 8 edges
9. `Inventory WMS App` - 8 edges
10. `Troubleshooting` - 7 edges

## Surprising Connections (you probably didn't know these)
- `App()` --calls--> `useCollection()`  [EXTRACTED]
  App.tsx → src/hooks/useCollection.ts
- `App()` --calls--> `useCollection()`  [EXTRACTED]
  src/App.tsx → src/hooks/useCollection.ts

## Communities (29 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.04
Nodes (44): API Fallback Strategy, "API key invalid", Build TypeScript, "Cannot find module 'firebase-functions'", Cloud Functions for Inventory WMS, code:typescript ({), code:bash (firebase functions:secrets:set GO_UPC_API_KEY), code:bash (# Real-time logs) (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (33): DataTable(), DataTableColumn, DataTableFilterField, DataTableProps, Modal(), ModalProps, ProjectDetailPage(), ProjectDetailPageProps (+25 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (39): After (Secure):, Before (Insecure):, 📋 Before vs After, Check Function Status, Client-Side (.env.local), code:bash (# List deployed functions), code:bash (firebase deploy --only functions), code:bash (# Kill processes on ports 5001, 8080, 9099) (+31 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (38): Advanced: Rate Limiting, Cloud Functions Setup Guide, code:block1 (Client → Direct API Call with exposed key → UPC API), code:env (# Enable Cloud Functions for secure API lookups), code:bash (# Start the Firebase emulators), code:bash (# Build and deploy Cloud Functions), code:bash (# Build your app), code:bash (firebase functions:list) (+30 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (31): 1. API Keys Exposed in Client-Side Code ⚠️, 2. Missing Firestore Security Rules 🚨 CRITICAL, 3. Recommended Security Enhancements, A. Implement Role-Based Access Control (RBAC), B. Input Validation, C. File Upload Security, code:typescript (// functions/src/index.ts), code:javascript (match /artifacts/{appId}/shared/global/inventory/{itemId} {) (+23 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (26): dependencies, firebase, react, react-dom, task-master-ai, devDependencies, autoprefixer, baseline-browser-mapping (+18 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (18): LoadingSpinner(), ActivityLog, AddWarehouseModalProps, InventoryItem, NavButtonProps, PageKey, PoFormState, Project (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (21): dependencies, firebase-admin, firebase-functions, description, devDependencies, @types/node, typescript, engines (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 9 - "Community 9"
Cohesion: 0.1
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (14): ActivityLog, AddWarehouseModalProps, InventoryItem, NavButtonProps, PageKey, PoFormState, PurchaseOrder, PurchaseOrderItem (+6 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (15): 10. Cloud Functions for Sensitive Operations, 11. Navigation (State-Based Routing), 12. Error Handling Convention, 13. Adding a New Feature Checklist, 1. Firestore CRUD Operations, 2. Activity Logging, 3. Real-Time Data via useCollection Hook, 4. Batch Writes for Multi-Document Operations (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.15
Nodes (12): compileOnSave, compilerOptions, esModuleInterop, module, noImplicitReturns, noUnusedLocals, outDir, skipLibCheck (+4 more)

### Community 13 - "Community 13"
Cohesion: 0.17
Nodes (11): firestore, rules, functions, ignore, runtime, source, hosting, headers (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.18
Nodes (11): code:bash (firebase functions:list  # Check deployed functions), code:bash (firebase functions:log --only lookupUPC), code:bash (firebase functions:secrets:set GO_UPC_API_KEY), code:typescript (// In functions/src/index.ts), Error: "API key invalid", Error: "Cloud function not found", Error: "Email must be verified", Error: "Network timeout" (+3 more)

### Community 15 - "Community 15"
Cohesion: 0.2
Nodes (9): Additional Documentation, code:block1 (src/), Commands, Environment Variables, Firestore Collections, Inventory WMS App, Key Architecture Decisions, Project Structure (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (9): code:bash (cd functions), code:bash (# Copy example files), code:bash (# Terminal 1: Start Firebase emulators), code:bash (# Set production secrets), 🚀 Quick Start (5 minutes), Step 1: Install Function Dependencies, Step 2: Configure Environment (Local Testing), Step 3: Test Locally (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (7): code:bash (# Ensure functions/.env exists with your keys), code:bash (cd functions), code:env (GO_UPC_API_KEY=your-actual-go-upc-key), code:bash (# Set Go-UPC API key), For Local Development (Emulator), For Production Deployment, Step 2: Configure Environment Variables

### Community 19 - "Community 19"
Cohesion: 0.29
Nodes (6): buildBasePath(), jsonSafeParse(), lookupProductByUpc(), parseCsvSimple(), ProductLookupResult, sanitizeImageUrl()

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (5): code:js (export default defineConfig([), code:js (// eslint.config.js), Expanding the ESLint configuration, React Compiler, React + TypeScript + Vite

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (5): appFilePath, content, __dirname, __filename, replacements

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (5): useCollection(), UseCollectionOptions, App(), App(), getInitialDarkMode()

### Community 23 - "Community 23"
Cohesion: 0.47
Nodes (3): AuthPage(), AuthPageProps, getAuthErrorMessage()

### Community 24 - "Community 24"
Cohesion: 0.4
Nodes (4): MessageBox, MessageBoxHandle, MessageBoxState, MessageBoxType

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (3): healthCheck, lookupUPC, ProductLookupResult

## Knowledge Gaps
- **284 isolated node(s):** `PageKey`, `Warehouse`, `InventoryItem`, `PurchaseOrderItem`, `PurchaseOrder` (+279 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Cloud Functions Setup Guide` connect `Community 3` to `Community 18`, `Community 14`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `Quick Start: Cloud Functions for Secure UPC Lookup` connect `Community 2` to `Community 16`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `PageKey`, `Warehouse`, `InventoryItem` to the rest of the system?**
  _284 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._