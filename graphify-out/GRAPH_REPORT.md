# Graph Report - BenchStockdev  (2026-05-20)

## Corpus Check
- 276 files · ~276,756 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 167 nodes · 350 edges · 21 communities (12 shown, 9 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4c7844f3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Core App Shell|Core App Shell]]
- [[_COMMUNITY_Data Tables & Activity Logs|Data Tables & Activity Logs]]
- [[_COMMUNITY_Search & Status Display|Search & Status Display]]
- [[_COMMUNITY_Firestore Collections & Pages|Firestore Collections & Pages]]
- [[_COMMUNITY_Multi-tenancy & UPC Lookup|Multi-tenancy & UPC Lookup]]
- [[_COMMUNITY_Toast Notifications & Undo|Toast Notifications & Undo]]
- [[_COMMUNITY_Modal Components|Modal Components]]
- [[_COMMUNITY_Dashboard UI|Dashboard UI]]
- [[_COMMUNITY_Auth & Error Handling|Auth & Error Handling]]
- [[_COMMUNITY_React Assets|React Assets]]
- [[_COMMUNITY_Firebase Config|Firebase Config]]
- [[_COMMUNITY_Component Composition|Component Composition]]
- [[_COMMUNITY_Type System|Type System]]
- [[_COMMUNITY_Monolithic Architecture|Monolithic Architecture]]
- [[_COMMUNITY_Health Check Function|Health Check Function]]
- [[_COMMUNITY_Build Tool Assets|Build Tool Assets]]
- [[_COMMUNITY_Framework Assets|Framework Assets]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]

## God Nodes (most connected - your core abstractions)
1. `Warehouse` - 16 edges
2. `InventoryItem` - 15 edges
3. `ActivityLog` - 15 edges
4. `ItemDetailPage()` - 12 edges
5. `Transfer` - 10 edges
6. `DashboardPage()` - 10 edges
7. `AdjustQuantityModal()` - 10 edges
8. `getStockStatus()` - 10 edges
9. `Modal()` - 9 edges
10. `Product` - 8 edges

## Surprising Connections (you probably didn't know these)
- `lookupProductByUpc()` --implements--> `Three-Tier UPC API Fallback Chain`  [INFERRED]
  src/utils/helpers.ts → functions/README.md
- `Custom Hooks Pattern` --rationale_for--> `useCollection()`  [INFERRED]
  .claude/docs/architectural_patterns.md → hooks/useCollection.ts
- `AdjustQuantityModal()` --references--> `Warehouse`  [EXTRACTED]
  features/inventory/AdjustQuantityModal.tsx → src/types.ts
- `ActivityHistoryPage()` --references--> `Warehouse`  [EXTRACTED]
  features/activityHistory/ActivityHistoryPage.tsx → src/types.ts
- `AdjustQuantityModal()` --references--> `InventoryItem`  [EXTRACTED]
  features/inventory/AdjustQuantityModal.tsx → src/types.ts

## Hyperedges (group relationships)
- **Cloud Functions with Auth and API Key Protection** — docs_architectural_patterns_cloudfunctions, docs_architectural_patterns_security, functions_readme_lookupupc [INFERRED 0.85]
- **Inventory Data Flow: App distributes inventory to pages** — src_app_appcomponent, dashboard_dashboardpage_dashboardpage, inventory_itemdetailpage_itemdetailpage, activityhistory_activityhistorypage_activityhistorypage [INFERRED 0.95]
- **Stock Status Pipeline Consumers** — utils_stockstatus_getstockstatus, components_statuschip_statuschip, components_globalsearch_globalsearch, dashboard_dashboardpage_dashboardpage [INFERRED 0.95]
- **Modal-based Interaction Pattern Components** — components_modal_modal, inventory_adjustquantitymodal_adjustquantitymodal, transfers_transfertrackingmodal_transfertrackingmodal [INFERRED 0.95]

## Communities (21 total, 9 thin omitted)

### Community 0 - "Core App Shell"
Cohesion: 0.07
Nodes (26): LoadingSpinner(), MessageBox, MessageBoxHandle, MessageBoxState, MessageBoxType, Custom Hooks Pattern, State Management Pattern, useCollection() (+18 more)

### Community 1 - "Data Tables & Activity Logs"
Cohesion: 0.2
Nodes (18): ActivityHistoryPage(), ActivityHistoryPageProps, DataTable(), DataTableColumn, DataTableFilterField, DataTableProps, ActivityLog, PoFormState (+10 more)

### Community 2 - "Search & Status Display"
Cohesion: 0.13
Nodes (19): GlobalSearch(), GlobalSearchProps, StatusChip(), StatusChipProps, statusLabels, statusStyles, Stock Status Evaluation Pipeline, DashboardPage() (+11 more)

### Community 4 - "Multi-tenancy & UPC Lookup"
Cohesion: 0.19
Nodes (13): ProjectModal(), ProjectModalProps, UserSettingsModal(), UserSettingsModalProps, Project, buildBasePath(), jsonSafeParse(), lookupProductByUpc() (+5 more)

### Community 5 - "Toast Notifications & Undo"
Cohesion: 0.36
Nodes (6): Toast(), ToastItemProps, ToastProps, typeStyles, AdjustUndoPayload, ToastMessage

### Community 6 - "Modal Components"
Cohesion: 0.36
Nodes (6): Modal(), ModalProps, AdjustQuantityModal(), AdjustQuantityModalProps, TransferTrackingModal(), TransferTrackingModalProps

### Community 7 - "Dashboard UI"
Cohesion: 0.22
Nodes (8): Accessibility & Inclusion, Anti-references, Brand Personality, Design Principles, Product, Product Purpose, Register, Users

### Community 8 - "Auth & Error Handling"
Cohesion: 0.38
Nodes (4): AuthPage(), AuthPageProps, getAuthErrorMessage Function, getAuthErrorMessage()

### Community 9 - "React Assets"
Cohesion: 0.67
Nodes (3): React Logo, React Framework, SVG Vector Graphic

### Community 17 - "Community 17"
Cohesion: 0.4
Nodes (4): hooks, PreToolUse, permissions, allow

### Community 18 - "Community 18"
Cohesion: 0.4
Nodes (5): Cloud Functions Pattern, Multi-Tenancy Pattern, Security Pattern, lookupUPC Cloud Function, Three-Tier UPC API Fallback Chain

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (3): healthCheck, lookupUPC, ProductLookupResult

## Knowledge Gaps
- **55 isolated node(s):** `allow`, `PreToolUse`, `Register`, `Users`, `Product Purpose` (+50 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `lookupProductByUpc()` connect `Multi-tenancy & UPC Lookup` to `Core App Shell`, `Community 18`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `Three-Tier UPC API Fallback Chain` connect `Community 18` to `Multi-tenancy & UPC Lookup`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `ItemDetailPage()` (e.g. with `AdjustQuantityModal()` and `Stock Status Evaluation Pipeline`) actually correct?**
  _`ItemDetailPage()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `allow`, `PreToolUse`, `Register` to the rest of the system?**
  _63 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core App Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Search & Status Display` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._