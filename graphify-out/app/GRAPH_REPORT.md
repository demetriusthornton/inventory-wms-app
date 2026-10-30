# Graph Report - .  (2026-10-29)

## Corpus Check
- Large corpus: 296 files · ~277,566 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 314 nodes · 431 edges · 20 communities (17 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Data Table & Activity UI|Data Table & Activity UI]]
- [[_COMMUNITY_Project Docs & Architecture|Project Docs & Architecture]]
- [[_COMMUNITY_App Root & Message Box|App Root & Message Box]]
- [[_COMMUNITY_Search & Status Components|Search & Status Components]]
- [[_COMMUNITY_Frontend Dependencies|Frontend Dependencies]]
- [[_COMMUNITY_Functions Dependencies|Functions Dependencies]]
- [[_COMMUNITY_App TS Config|App TS Config]]
- [[_COMMUNITY_Node TS Config|Node TS Config]]
- [[_COMMUNITY_Functions TS Config|Functions TS Config]]
- [[_COMMUNITY_Firebase Config|Firebase Config]]
- [[_COMMUNITY_Skills Lock|Skills Lock]]
- [[_COMMUNITY_Product & Design Context|Product & Design Context]]
- [[_COMMUNITY_Label Replace Script|Label Replace Script]]
- [[_COMMUNITY_Auth Page|Auth Page]]
- [[_COMMUNITY_UPC Lookup Functions|UPC Lookup Functions]]
- [[_COMMUNITY_TS Project References|TS Project References]]
- [[_COMMUNITY_UPC Fallback Chain|UPC Fallback Chain]]
- [[_COMMUNITY_Health Check Function|Health Check Function]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 20 edges
2. `compilerOptions` - 18 edges
3. `CLAUDE.md (project guide)` - 15 edges
4. `devDependencies` - 10 edges
5. `compilerOptions` - 10 edges
6. `Warehouse` - 10 edges
7. `scripts` - 8 edges
8. `InventoryItem` - 8 edges
9. `ActivityLog` - 8 edges
10. `CLOUD_FUNCTIONS_SETUP.md (setup guide)` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Firestore emulator and Rules Playground` --semantically_similar_to--> `Firebase emulator local testing`  [INFERRED] [semantically similar]
  firestore-rules-test.md → CLOUD_FUNCTIONS_SETUP.md
- `QUICKSTART_CLOUD_FUNCTIONS.md (5-minute quick start)` --semantically_similar_to--> `CLOUD_FUNCTIONS_SETUP.md (setup guide)`  [INFERRED] [semantically similar]
  QUICKSTART_CLOUD_FUNCTIONS.md → CLOUD_FUNCTIONS_SETUP.md
- `KIICH multi-warehouse inventory system` --conceptually_related_to--> `Firestore collections (warehouses, inventory, purchaseOrders, poHistory, moves, activityHistory)`  [INFERRED]
  PRODUCT.md → CLAUDE.md
- `API key domain restrictions` --conceptually_related_to--> `API keys exposed in client-side bundle`  [INFERRED]
  firestore-rules-test.md → SECURITY.md
- `App()` --calls--> `useCollection()`  [EXTRACTED]
  App.tsx → src/hooks/useCollection.ts

## Hyperedges (group relationships)
- **Firebase security layers (rules, API key restrictions, Cloud Functions)** — security_firestore_rules, firestore_rules_test_domain_restrictions, security_cloud_functions_proxy [INFERRED 0.75]
- **API key security and Cloud Functions documentation set** — security, cloud_functions_setup, quickstart_cloud_functions [INFERRED 0.85]

## Communities (20 total, 3 thin omitted)

### Community 0 - "Data Table & Activity UI"
Cohesion: 0.06
Nodes (41): ActivityHistoryPage(), ActivityHistoryPageProps, DataTable(), DataTableColumn, DataTableFilterField, DataTableProps, LoadingSpinner(), Modal() (+33 more)

### Community 1 - "Project Docs & Architecture"
Cohesion: 0.08
Nodes (36): CLAUDE.md (project guide), App.tsx monolithic main component, Cloud Functions backend (UPC lookup, health check), Environment variables and API keys, Firestore collections (warehouses, inventory, purchaseOrders, poHistory, moves, activityHistory), Graphify knowledge graph usage rules, Organization-based multi-tenancy, Reusable components (DataTable, Modal, MessageBox, LoadingSpinner) (+28 more)

### Community 2 - "App Root & Message Box"
Cohesion: 0.07
Nodes (26): MessageBox, MessageBoxHandle, MessageBoxState, MessageBoxType, useCollection(), UseCollectionOptions, ActivityLog, AddWarehouseModalProps (+18 more)

### Community 3 - "Search & Status Components"
Cohesion: 0.1
Nodes (18): GlobalSearch(), GlobalSearchProps, StatusChip(), StatusChipProps, statusLabels, statusStyles, DashboardPage(), DashboardPageProps (+10 more)

### Community 4 - "Frontend Dependencies"
Cohesion: 0.08
Nodes (25): dependencies, firebase, react, react-dom, task-master-ai, devDependencies, autoprefixer, postcss (+17 more)

### Community 5 - "Functions Dependencies"
Cohesion: 0.09
Nodes (21): dependencies, firebase-admin, firebase-functions, description, devDependencies, @types/node, typescript, engines (+13 more)

### Community 6 - "App TS Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 7 - "Node TS Config"
Cohesion: 0.1
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 8 - "Functions TS Config"
Cohesion: 0.15
Nodes (12): compileOnSave, compilerOptions, esModuleInterop, module, noImplicitReturns, noUnusedLocals, outDir, skipLibCheck (+4 more)

### Community 9 - "Firebase Config"
Cohesion: 0.17
Nodes (11): firestore, rules, functions, ignore, runtime, source, hosting, headers (+3 more)

### Community 10 - "Skills Lock"
Cohesion: 0.25
Nodes (7): computedHash, skillPath, source, sourceType, skills, impeccable, version

### Community 11 - "Product & Design Context"
Cohesion: 0.43
Nodes (7): PRODUCT.md (KIICH product context), WCAG 2.1 AA accessibility requirements, Anti-references (consumer-warm, enterprise ERP), Brand personality: reliable, direct, fast, Design principles (data is the UI, speed over ceremony), KIICH multi-warehouse inventory system, Warehouse staff and manager personas

### Community 12 - "Label Replace Script"
Cohesion: 0.33
Nodes (5): appFilePath, content, __dirname, __filename, replacements

### Community 13 - "Auth Page"
Cohesion: 0.47
Nodes (3): AuthPage(), AuthPageProps, getAuthErrorMessage()

### Community 14 - "UPC Lookup Functions"
Cohesion: 0.5
Nodes (3): healthCheck, lookupUPC, ProductLookupResult

## Knowledge Gaps
- **168 isolated node(s):** `version`, `source`, `sourceType`, `skillPath`, `computedHash` (+163 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Modal()` connect `Data Table & Activity UI` to `App Root & Message Box`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `DataTable()` connect `Data Table & Activity UI` to `App Root & Message Box`?**
  _High betweenness centrality (0.008) - this node is a cross-community bridge._
- **What connects `version`, `source`, `sourceType` to the rest of the system?**
  _168 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Data Table & Activity UI` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Project Docs & Architecture` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `App Root & Message Box` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Search & Status Components` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._