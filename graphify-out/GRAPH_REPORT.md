# Graph Report - .  (2026-10-29)

## Corpus Check
- Large corpus: 296 files · ~277,566 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 318 nodes · 407 edges · 25 communities (18 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 8 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

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
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]

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
- `QUICKSTART_CLOUD_FUNCTIONS.md (5-minute quick start)` --semantically_similar_to--> `CLOUD_FUNCTIONS_SETUP.md (setup guide)`  [INFERRED] [semantically similar]
  QUICKSTART_CLOUD_FUNCTIONS.md → CLOUD_FUNCTIONS_SETUP.md
- `Firestore emulator and Rules Playground` --semantically_similar_to--> `Firebase emulator local testing`  [INFERRED] [semantically similar]
  firestore-rules-test.md → CLOUD_FUNCTIONS_SETUP.md
- `KIICH multi-warehouse inventory system` --conceptually_related_to--> `Firestore collections (warehouses, inventory, purchaseOrders, poHistory, moves, activityHistory)`  [INFERRED]
  PRODUCT.md → CLAUDE.md
- `API key domain restrictions` --conceptually_related_to--> `API keys exposed in client-side bundle`  [INFERRED]
  firestore-rules-test.md → SECURITY.md
- `App()` --calls--> `useCollection()`  [EXTRACTED]
  src/App.tsx → /Users/kingdem/Projects/BenchStockdev/src/hooks/useCollection.ts

## Hyperedges (group relationships)
- **API key security and Cloud Functions documentation set** — security, cloud_functions_setup, quickstart_cloud_functions [INFERRED 0.85]
- **Firebase security layers (rules, API key restrictions, Cloud Functions)** — security_firestore_rules, firestore_rules_test_domain_restrictions, security_cloud_functions_proxy [INFERRED 0.75]

## Communities (25 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (40): ActivityHistoryPage(), ActivityHistoryPageProps, DataTable(), DataTableColumn, DataTableFilterField, DataTableProps, Modal(), ModalProps (+32 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (27): ActivityLog, AddWarehouseModalProps, App(), InventoryItem, NavButtonProps, PageKey, PoFormState, PurchaseOrder (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.08
Nodes (36): CLAUDE.md (project guide), App.tsx monolithic main component, Cloud Functions backend (UPC lookup, health check), Environment variables and API keys, Firestore collections (warehouses, inventory, purchaseOrders, poHistory, moves, activityHistory), Graphify knowledge graph usage rules, Organization-based multi-tenancy, Reusable components (DataTable, Modal, MessageBox, LoadingSpinner) (+28 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (18): GlobalSearch(), GlobalSearchProps, StatusChip(), StatusChipProps, statusLabels, statusStyles, DashboardPage(), DashboardPageProps (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (25): dependencies, firebase, react, react-dom, task-master-ai, devDependencies, autoprefixer, postcss (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (21): dependencies, firebase-admin, firebase-functions, description, devDependencies, @types/node, typescript, engines (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.1
Nodes (19): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (12): compileOnSave, compilerOptions, esModuleInterop, module, noImplicitReturns, noUnusedLocals, outDir, skipLibCheck (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (11): firestore, rules, functions, ignore, runtime, source, hosting, headers (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (7): computedHash, skillPath, source, sourceType, skills, impeccable, version

### Community 11 - "Community 11"
Cohesion: 0.43
Nodes (7): PRODUCT.md (KIICH product context), WCAG 2.1 AA accessibility requirements, Anti-references (consumer-warm, enterprise ERP), Brand personality: reliable, direct, fast, Design principles (data is the UI, speed over ceremony), KIICH multi-warehouse inventory system, Warehouse staff and manager personas

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (5): appFilePath, content, __dirname, __filename, replacements

### Community 13 - "Community 13"
Cohesion: 0.4
Nodes (3): AuthPage(), AuthPageProps, getAuthErrorMessage()

### Community 14 - "Community 14"
Cohesion: 0.5
Nodes (3): healthCheck, lookupUPC, ProductLookupResult

## Knowledge Gaps
- **172 isolated node(s):** `version`, `source`, `sourceType`, `skillPath`, `computedHash` (+167 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DataTable()` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `Modal()` connect `Community 0` to `Community 1`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `version`, `source`, `sourceType` to the rest of the system?**
  _172 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._