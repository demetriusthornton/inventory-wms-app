import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import type { ReactNode } from "react";

import { initializeApp, getApps } from "firebase/app";
import type { FirebaseApp } from "firebase/app";

import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged,
} from "firebase/auth";
import type { User } from "firebase/auth";

import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  query,
  where,
  writeBatch,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";

type PageKey = "inventory" | "pos" | "poHistory" | "transfers" | "warehouses";

interface Warehouse {
  id: string;
  shortCode: string;
  name: string;
  streetAddress: string;
  city: string;
  state: string;
}

interface InventoryItem {
  id: string;
  modelNumber: string;
  name: string;
  category: string;
  amountInInventory: number;
  numOnOrder: number;
  manufactureName: string;
  imageUrl: string;
  assignedBranchId: string;
  minStockLevel: number;
}

type PurchaseOrderStatus = "pending" | "received" | "deleted";

interface PurchaseOrderItem {
  itemName: string;
  modelNumber: string;
  amountOrdered: number;
  category: string;
  orderCost: number;
  amountReceived: number;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  vendor: string;
  manufacture: string;
  receivingWarehouseId: string;
  items: PurchaseOrderItem[];
  status: "pending" | "received" | "deleted";
  orderDate: string;
  receivedDate?: string | null;
  deletedDate?: string | null;
}
interface PoFormState {
  orderNumber: string;
  vendor: string;
  manufacture: string;
  receivingWarehouseId: string;
  items: PurchaseOrderItem[];
}

const makeEmptyPoForm = (): PoFormState => ({
  orderNumber: "",
  vendor: "",
  manufacture: "",
  receivingWarehouseId: "",
  items: [
    {
      itemName: "",
      modelNumber: "",
      amountOrdered: 0,
      category: "",
      orderCost: 0,
      amountReceived: 0,
    },
  ],
});
type TransferStatus = "pending" | "in-transit" | "completed";

interface Transfer {
  id: string;
  transferId: string;
  itemModelNumber: string;
  itemName: string;
  quantity: number;
  sourceBranchId: string;
  destinationBranchId: string;
  dateInitiated: string;
  status: TransferStatus;
  dateCompleted?: string;
}

interface DataTableColumn<T> {
  key: string;
  label: string;
  render?: (row: T) => ReactNode;
  sortFn?: (a: T, b: T) => number;
}

interface DataTableFilterField<T> {
  key: keyof T;
  label: string;
  type: "text" | "select";
  options?: { label: string; value: string }[];
}

interface DataTableProps<T> {
  title: string;
  data: T[];
  columns: DataTableColumn<T>[];
  searchFields: (keyof T)[];
  filterFields?: DataTableFilterField<T>[];
  getRowId: (row: T) => string;
  actions?: (row: T) => ReactNode;
  children?: ReactNode;
}

type MessageBoxType = "alert" | "confirm";

export interface MessageBoxHandle {
  alert: (message: string) => void;
  confirm: (message: string) => Promise<boolean>;
}

interface MessageBoxState {
  open: boolean;
  message: string;
  type: MessageBoxType;
}

const MessageBox = forwardRef<MessageBoxHandle>((_, ref) => {
  const [state, setState] = useState<MessageBoxState>({
    open: false,
    message: "",
    type: "alert",
  });
  const resolverRef = useRef<(value: boolean) => void>();

  const close = (result: boolean) => {
    setState((prev) => ({ ...prev, open: false }));
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = undefined;
    }
  };

  useImperativeHandle(ref, () => ({
    alert(message: string) {
      setState({ open: true, message, type: "alert" });
      resolverRef.current = undefined;
    },
    confirm(message: string) {
      setState({ open: true, message, type: "confirm" });
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
      });
    },
  }));

  if (!state.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
        <h2 className="text-lg font-semibold mb-4 text-slate-900">
          {state.type === "alert" ? "Message" : "Confirm"}
        </h2>
        <p className="text-slate-700 mb-6 whitespace-pre-line">
          {state.message}
        </p>
        <div className="flex justify-end gap-3">
          {state.type === "confirm" && (
            <button
              className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 text-sm hover:bg-slate-50"
              onClick={() => close(false)}
            >
              Cancel
            </button>
          )}
          <button
            className="px-4 py-2 rounded-md bg-[#005691] text-white text-sm hover:bg-[#00426e]"
            onClick={() => close(true)}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
});
MessageBox.displayName = "MessageBox";

interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClass?: string;
}

const Modal: React.FC<ModalProps> = ({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidthClass = "max-w-2xl",
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div
        className={`bg-white rounded-lg shadow-xl w-full ${maxWidthClass} max-h-[90vh] flex flex-col`}
      >
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {title ?? ""}
          </h2>
          <button
            className="text-slate-500 hover:text-slate-800 text-xl leading-none"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center py-8">
    <div className="w-10 h-10 border-4 border-slate-200 border-t-[#005691] rounded-full animate-spin" />
  </div>
);

function DataTable<T extends Record<string, any>>({
  title,
  data,
  columns,
  searchFields,
  filterFields,
  getRowId,
  actions,
  children,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const handleSort = (key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((prevDir) => (prevDir === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  };

  const filteredData = useMemo(() => {
    let rows = [...data];

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      rows = rows.filter((row) =>
        searchFields.some((field) => {
          const value = row[field];
          if (value === undefined || value === null) return false;
          return String(value).toLowerCase().includes(searchLower);
        })
      );
    }

    if (filterFields && filterFields.length > 0) {
      rows = rows.filter((row) =>
        filterFields.every((field) => {
          const value = filters[String(field.key)];
          if (!value) return true;
          const rowVal = row[field.key];
          return String(rowVal) === value;
        })
      );
    }

    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      rows.sort((a, b) => {
        if (col?.sortFn) {
          const result = col.sortFn(a, b);
          return sortDir === "asc" ? result : -result;
        }
        const av = a[sortKey];
        const bv = b[sortKey];
        if (av === undefined && bv === undefined) return 0;
        if (av === undefined) return sortDir === "asc" ? -1 : 1;
        if (bv === undefined) return sortDir === "asc" ? 1 : -1;
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return rows;
  }, [
    data,
    search,
    searchFields,
    filters,
    filterFields,
    sortKey,
    sortDir,
    columns,
  ]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end">
          <input
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691] focus:border-[#005691]"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filterFields && filterFields.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filterFields.map((field) => (
                <select
                  key={String(field.key)}
                  className="border border-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-[#005691]"
                  value={filters[String(field.key)] ?? ""}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      [String(field.key)]: e.target.value,
                    }))
                  }
                >
                  <option value="">{field.label}</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          )}
          {children}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left text-xs font-semibold text-slate-600 cursor-pointer select-none"
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {sortKey === col.key && (
                      <span className="text-[10px]">
                        {sortDir === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (actions ? 1 : 0)}
                  className="px-3 py-6 text-center text-slate-500"
                >
                  No records
                </td>
              </tr>
            )}
            {filteredData.map((row) => (
              <tr
                key={getRowId(row)}
                className="border-t border-slate-100 hover:bg-slate-50"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2 align-top">
                    {col.render ? col.render(row) : String(row[col.key] ?? "")}
                  </td>
                ))}
                {actions && (
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface AddWarehouseModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (warehouse: Warehouse) => void;
  db: Firestore;
  basePath: string;
  existing?: Warehouse | null;
}

const AddWarehouseModal: React.FC<AddWarehouseModalProps> = ({
  open,
  onClose,
  onSaved,
  db,
  basePath,
  existing,
}) => {
  const [shortCode, setShortCode] = useState("");
  const [name, setName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setShortCode(existing.shortCode);
      setName(existing.name);
      setStreetAddress(existing.streetAddress);
      setCity(existing.city);
      setStateVal(existing.state);
    } else {
      setShortCode("");
      setName("");
      setStreetAddress("");
      setCity("");
      setStateVal("");
    }
  }, [existing, open]);

  const handleSave = async () => {
    if (!name.trim() || !shortCode.trim()) return;
    setSaving(true);
    const id = existing?.id ?? crypto.randomUUID();
    const ref = doc(collection(db, `${basePath}/warehouses`), id);
    const warehouse: Warehouse = {
      id,
      shortCode: shortCode.trim(),
      name: name.trim(),
      streetAddress: streetAddress.trim(),
      city: city.trim(),
      state: stateVal.trim(),
    };
    await setDoc(ref, warehouse);
    setSaving(false);
    onSaved(warehouse);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? "Edit Warehouse" : "Add Warehouse"}
      footer={
        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-md bg-[#005691] text-sm text-white hover:bg-[#00426e]"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Short Code
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Name
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Street Address
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            City
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            State
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
            value={stateVal}
            onChange={(e) => setStateVal(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
};

function jsonSafeParse<T = any>(value: any): T | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return value as T;
}

function buildBasePath(appId: string, userId: string) {
  return `artifacts/${appId}/users/${userId}`;
}

function parseCsvSimple(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  return lines.map((line) => line.split(",").map((cell) => cell.trim()));
}

interface UseCollectionOptions<T> {
  db: Firestore | null;
  basePath: string | null;
  collectionName: string;
  whereFilters?: {
    field: string;
    op: "==" | "!=" | "<=" | ">=" | "<" | ">";
    value: any;
  }[];
}

function useCollection<T>({
  db,
  basePath,
  collectionName,
  whereFilters,
}: UseCollectionOptions<T>): { data: T[]; loading: boolean } {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !basePath) {
      setData([]);
      setLoading(false);
      return;
    }
    const colRef = collection(db, `${basePath}/${collectionName}`);
    let q: any = query(colRef);
    if (whereFilters && whereFilters.length > 0) {
      whereFilters.forEach((flt) => {
        q = query(q, where(flt.field, flt.op, flt.value));
      });
    }
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: any[] = [];
        snap.forEach((docSnap) => {
          rows.push({ id: docSnap.id, ...docSnap.data() });
        });
        setData(rows as T[]);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );
    return () => unsub();
  }, [db, basePath, collectionName, JSON.stringify(whereFilters)]);

  return { data, loading };
}

const App: React.FC = () => {
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [authInitDone, setAuthInitDone] = useState(false);
  const [page, setPage] = useState<PageKey>("inventory");

  const messageBoxRef = useRef<MessageBoxHandle>(null);

  const basePath = useMemo(
    () => (appId && authUser ? buildBasePath(appId, authUser.uid) : null),
    [appId, authUser]
  );

  useEffect(() => {
    const w = window as any;
    const cfg = jsonSafeParse(w.__firebase_config);
    const appIdGlobal = w.__app_id as string | undefined;
    if (!cfg || !appIdGlobal) {
      console.error("Missing firebase config or app id");
      return;
    }
    setAppId(appIdGlobal);
    let app: FirebaseApp;
    if (getApps().length === 0) {
      app = initializeApp(cfg);
    } else {
      app = getApps()[0]!;
    }
    setFirebaseApp(app);
    const auth = getAuth(app);
    const token = w.__initial_auth_token as string | undefined;

    const signIn = async () => {
      try {
        if (token) {
          await signInWithCustomToken(auth, token);
        } else {
          await signInAnonymously(auth);
        }
      } catch {
        await signInAnonymously(auth);
      }
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
        setDb(getFirestore(app));
        setAuthInitDone(true);
      } else {
        signIn();
      }
    });

    signIn();

    return () => unsub();
  }, []);

  const { data: warehouses, loading: loadingWarehouses } =
    useCollection<Warehouse>({
      db,
      basePath,
      collectionName: "warehouses",
    });

  const { data: inventoryItems, loading: loadingInventory } =
    useCollection<InventoryItem>({
      db,
      basePath,
      collectionName: "inventory",
    });

  const { data: purchaseOrders, loading: loadingPOs } =
    useCollection<PurchaseOrder>({
      db,
      basePath,
      collectionName: "purchaseOrders",
    });

  const { data: poHistory, loading: loadingPoHistory } =
    useCollection<PurchaseOrder>({
      db,
      basePath,
      collectionName: "poHistory",
    });

  const { data: transfers, loading: loadingTransfers } =
    useCollection<Transfer>({
      db,
      basePath,
      collectionName: "moves",
    });

  const pendingPOs = useMemo(
    () => purchaseOrders.filter((po) => po.status === "pending"),
    [purchaseOrders]
  );

  const onOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const po of pendingPOs) {
      for (const item of po.items) {
        const remaining = item.amountOrdered - (item.amountReceived ?? 0);
        if (remaining > 0) {
          const key = item.modelNumber;
          map.set(key, (map.get(key) ?? 0) + remaining);
        }
      }
    }
    return map;
  }, [pendingPOs]);

  const enrichedInventory: InventoryItem[] = useMemo(
    () =>
      inventoryItems.map((item) => ({
        ...item,
        numOnOrder: onOrderMap.get(item.modelNumber) ?? 0,
      })),
    [inventoryItems, onOrderMap]
  );

  const warehouseSelectOptions = useMemo(
    () =>
      warehouses.map((w) => ({
        label: w.shortCode || w.name,
        value: w.id,
      })),
    [warehouses]
  );

  const inventoryCategoryOptions = useMemo(() => {
    const set = new Set<string>();
    enrichedInventory.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).map((c) => ({ label: c, value: c }));
  }, [enrichedInventory]);

  const poVendorOptions = useMemo(() => {
    const set = new Set<string>();
    purchaseOrders.forEach((po) => {
      if (po.vendor) set.add(po.vendor);
    });
    return Array.from(set).map((v) => ({ label: v, value: v }));
  }, [purchaseOrders]);

  const poManufactureOptions = useMemo(() => {
    const set = new Set<string>();
    purchaseOrders.forEach((po) => {
      if (po.manufacture) set.add(po.manufacture);
    });
    return Array.from(set).map((m) => ({ label: m, value: m }));
  }, [purchaseOrders]);

  const poHistoryStatusOptions = useMemo(() => {
    const set = new Set<string>();
    poHistory.forEach((po) => {
      if (po.status) set.add(po.status);
    });
    return Array.from(set).map((s) => ({ label: s, value: s }));
  }, [poHistory]);

  const transferStatusOptions = useMemo(() => {
    const set = new Set<string>();
    transfers.forEach((t) => {
      if (t.status) set.add(t.status);
    });
    return Array.from(set).map((s) => ({ label: s, value: s }));
  }, [transfers, poHistory]);

  const transferSourceOptions = useMemo(() => {
    const set = new Set<string>();
    transfers.forEach((t) => set.add(t.sourceBranchId));
    return Array.from(set).map((id) => {
      const wh = warehouses.find((w) => w.id === id);
      return {
        label: wh ? wh.shortCode || wh.name : id,
        value: id,
      };
    });
  }, [transfers, warehouses]);

  const transferDestinationOptions = useMemo(() => {
    const set = new Set<string>();
    transfers.forEach((t) => set.add(t.destinationBranchId));
    return Array.from(set).map((id) => {
      const wh = warehouses.find((w) => w.id === id);
      return {
        label: wh ? wh.shortCode || wh.name : id,
        value: id,
      };
    });
  }, [transfers, warehouses]);

  const warehouseStateOptions = useMemo(() => {
    const set = new Set<string>();
    warehouses.forEach((w) => {
      if (w.state) set.add(w.state);
    });
    return Array.from(set).map((s) => ({ label: s, value: s }));
  }, [warehouses]);

  const [inventoryModalOpen, setInventoryModalOpen] = useState(false);
  const [editingInventoryItem, setEditingInventoryItem] =
    useState<InventoryItem | null>(null);

  const [inventoryCsvModalOpen, setInventoryCsvModalOpen] = useState(false);
  const inventoryCsvInputRef = useRef<HTMLInputElement | null>(null);

  const [warehouseModalQuickOpen, setWarehouseModalQuickOpen] = useState(false);
  const [warehouseModalMainOpen, setWarehouseModalMainOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(
    null
  );

  const [poModalOpen, setPoModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);

  const [poReceiveMode, setPoReceiveMode] = useState<{
    po: PurchaseOrder;
    mode: "full" | "partial";
  } | null>();
  const [partialReceiveValues, setPartialReceiveValues] = useState<
    Record<string, number>
  >({});

  const [warehouseCsvModalOpen, setWarehouseCsvModalOpen] = useState(false);
  const warehouseCsvInputRef = useRef<HTMLInputElement | null>(null);

  const [transferModalOpen, setTransferModalOpen] = useState(false);

  const [inventoryForm, setInventoryForm] = useState<Partial<InventoryItem>>({
    modelNumber: "",
    name: "",
    category: "",
    amountInInventory: 0,
    manufactureName: "",
    imageUrl: "",
    assignedBranchId: "",
    minStockLevel: 0,
  });

  const resetInventoryForm = () => {
    setInventoryForm({
      modelNumber: "",
      name: "",
      category: "",
      amountInInventory: 0,
      manufactureName: "",
      imageUrl: "",
      assignedBranchId: "",
      minStockLevel: 0,
    });
    setEditingInventoryItem(null);
  };

  const openInventoryModalForNew = () => {
    resetInventoryForm();
    setInventoryModalOpen(true);
  };

  const openInventoryModalForEdit = (item: InventoryItem) => {
    setInventoryForm(item);
    setEditingInventoryItem(item);
    setInventoryModalOpen(true);
  };

  const handleSaveInventory = async () => {
    if (!db || !basePath) return;
    const {
      modelNumber,
      name,
      category,
      amountInInventory,
      manufactureName,
      imageUrl,
      assignedBranchId,
      minStockLevel,
    } = inventoryForm;
    if (
      !modelNumber ||
      !name ||
      !category ||
      !assignedBranchId ||
      minStockLevel === undefined ||
      amountInInventory === undefined
    ) {
      messageBoxRef.current?.alert("Fill in required inventory fields.");
      return;
    }
    const id = editingInventoryItem?.id ?? crypto.randomUUID();
    const ref = doc(collection(db, `${basePath}/inventory`), id);
    const payload: InventoryItem = {
      id,
      modelNumber: String(modelNumber),
      name: String(name),
      category: String(category),
      amountInInventory: Number(amountInInventory),
      numOnOrder: 0,
      manufactureName: String(manufactureName ?? ""),
      imageUrl: String(imageUrl ?? ""),
      assignedBranchId: String(assignedBranchId),
      minStockLevel: Number(minStockLevel),
    };
    await setDoc(ref, payload);
    setInventoryModalOpen(false);
    resetInventoryForm();
  };

  const handleInventoryCsvImport = async (file: File) => {
    if (!db || !basePath) return;
    const text = await file.text();
    const rows = parseCsvSimple(text);
    if (rows.length < 2) {
      messageBoxRef.current?.alert("CSV has no data rows.");
      return;
    }
    const header = rows[0].map((h) => h.toLowerCase());
    const idx = (name: string) => header.indexOf(name.toLowerCase());

    const batch = writeBatch(db);
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) continue;
      const modelNumber =
        row[idx("modelNumber".toLowerCase())] ?? row[idx("modelnumber")];
      if (!modelNumber) continue;
      const id = crypto.randomUUID();
      const ref = doc(collection(db, `${basePath}/inventory`), id);
      const item: InventoryItem = {
        id,
        modelNumber,
        name: row[idx("name")] ?? "",
        category: row[idx("category")] ?? "",
        amountInInventory: Number(
          row[idx("amountInInventory")] ?? row[idx("amountininventory")] ?? 0
        ),
        numOnOrder: 0,
        manufactureName:
          row[idx("manufactureName")] ?? row[idx("manufacturename")] ?? "",
        imageUrl: row[idx("imageUrl")] ?? row[idx("imageurl")] ?? "",
        assignedBranchId:
          row[idx("assignedBranchId")] ?? row[idx("assignedbranchid")] ?? "",
        minStockLevel: Number(
          row[idx("minStockLevel")] ?? row[idx("minstocklevel")] ?? 0
        ),
      };
      batch.set(ref, item);
    }
    await batch.commit();
    messageBoxRef.current?.alert("Inventory CSV import complete.");
  };

  const [poForm, setPoForm] = useState<PoFormState>(makeEmptyPoForm);

  const resetPoForm = () => {
    setPoForm(makeEmptyPoForm());
    setEditingPO(null);
  };

  const openPoModalForNew = () => {
    resetPoForm();
    setPoModalOpen(true);
  };

  const openPoModalForEdit = (po: PurchaseOrder) => {
    setPoForm({
      orderNumber: po.orderNumber,
      vendor: po.vendor,
      manufacture: po.manufacture,
      receivingWarehouseId: po.receivingWarehouseId,
      items: po.items.map((it) => ({ ...it })),
    });
    setEditingPO(po);
    setPoModalOpen(true);
  };

  const handleAddPoLineItem = () => {
    setPoForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemName: "",
          modelNumber: "",
          amountOrdered: 0,
          category: "",
          orderCost: 0,
          amountReceived: 0,
        },
      ],
    }));
  };

  const handleUpdatePoLineItem = (
    index: number,
    field: keyof PurchaseOrderItem,
    value: any
  ) => {
    setPoForm((prev) => {
      const items = [...prev.items];
      const item = { ...items[index] };
      if (
        field === "amountOrdered" ||
        field === "orderCost" ||
        field === "amountReceived"
      ) {
        (item as any)[field] = Number(value);
      } else {
        (item as any)[field] = value;
      }
      items[index] = item;
      return { ...prev, items };
    });
  };

  const handleRemovePoLineItem = (index: number) => {
    setPoForm((prev) => {
      const items = [...prev.items];
      items.splice(index, 1);
      return { ...prev, items };
    });
  };

  const handleSavePurchaseOrder = async () => {
    if (!db || !basePath) {
      console.error("DB or basePath missing, cannot save PO");
      messageBoxRef.current?.alert(
        "Internal configuration error. Database is not ready."
      );
      return;
    }

    const { orderNumber, vendor, manufacture, receivingWarehouseId, items } =
      poForm;

    if (!orderNumber || !vendor || !manufacture || !receivingWarehouseId) {
      messageBoxRef.current?.alert("Fill in all required PO fields.");
      return;
    }

    if (!items || items.length === 0) {
      messageBoxRef.current?.alert("Add at least one line item.");
      return;
    }

    const id = editingPO?.id ?? crypto.randomUUID();
    const ref = doc(collection(db, `${basePath}/purchaseOrders`), id);
    const nowIso = new Date().toISOString();

    const po: PurchaseOrder = {
      id,
      orderNumber,
      vendor,
      manufacture,
      receivingWarehouseId,
      items: items.map((it) => ({
        itemName: it.itemName,
        modelNumber: it.modelNumber,
        amountOrdered: Number(it.amountOrdered),
        category: it.category,
        orderCost: Number(it.orderCost),
        amountReceived: Number(it.amountReceived ?? 0),
      })),
      status: "pending",
      orderDate: editingPO ? editingPO.orderDate : nowIso,
    };

    // Only carry dates over if we are editing and they exist.
    // New POs do not need these fields at all.
    if (editingPO?.receivedDate) {
      po.receivedDate = editingPO.receivedDate;
    }
    if (editingPO?.deletedDate) {
      po.deletedDate = editingPO.deletedDate;
    }

    console.log(
      "Saving purchase order:",
      po,
      "to",
      `${basePath}/purchaseOrders/${id}`
    );

    try {
      await setDoc(ref, po);
      console.log("PO saved successfully");
      setPoModalOpen(false);
      resetPoForm();
      messageBoxRef.current?.alert("Purchase order saved.");
    } catch (err) {
      console.error("Failed to save purchase order", err);
      messageBoxRef.current?.alert(
        "Failed to save purchase order. Open the browser console for error details."
      );
    }
  };

  const handleReceivePoFull = async (po: PurchaseOrder) => {
    if (!db || !basePath) return;
    const confirmed = await messageBoxRef.current?.confirm(
      `Receive remaining items in full for PO ${po.orderNumber}?`
    );
    if (!confirmed) return;

    const batch = writeBatch(db);
    for (const item of po.items) {
      const remaining = item.amountOrdered - (item.amountReceived ?? 0);
      if (remaining <= 0) continue;
      const inventoryItem = inventoryItems.find(
        (inv) =>
          inv.modelNumber === item.modelNumber &&
          inv.assignedBranchId === po.receivingWarehouseId
      );
      if (inventoryItem) {
        const invRef = doc(
          collection(db, `${basePath}/inventory`),
          inventoryItem.id
        );
        batch.update(invRef, {
          amountInInventory:
            Number(inventoryItem.amountInInventory) + remaining,
        });
      } else {
        const id = crypto.randomUUID();
        const invRef = doc(collection(db, `${basePath}/inventory`), id);
        const template =
          inventoryItems.find((inv) => inv.modelNumber === item.modelNumber) ??
          null;
        const newItem: InventoryItem = {
          id,
          modelNumber: item.modelNumber,
          name: item.itemName,
          category: item.category,
          amountInInventory: remaining,
          numOnOrder: 0,
          manufactureName: po.manufacture,
          imageUrl: "",
          assignedBranchId: po.receivingWarehouseId,
          minStockLevel: template?.minStockLevel ?? 0,
        };
        batch.set(invRef, newItem);
      }
    }

    const nowIso = new Date().toISOString();
    const historyRef = doc(collection(db, `${basePath}/poHistory`), po.id);
    const poRef = doc(collection(db, `${basePath}/purchaseOrders`), po.id);
    const poReceived: PurchaseOrder = {
      ...po,
      status: "received",
      receivedDate: nowIso,
      items: po.items.map((it) => ({
        ...it,
        amountReceived: it.amountOrdered,
      })),
    };
    batch.set(historyRef, poReceived);
    batch.delete(poRef);
    await batch.commit();
  };

  const openPartialReceiveModal = (po: PurchaseOrder) => {
    const values: Record<string, number> = {};
    po.items.forEach((item, idx) => {
      const remaining = item.amountOrdered - (item.amountReceived ?? 0);
      values[String(idx)] = remaining > 0 ? remaining : 0;
    });
    setPartialReceiveValues(values);
    setPoReceiveMode({ po, mode: "partial" });
  };

  const handleSubmitPartialReceive = async () => {
    if (!db || !basePath || !poReceiveMode) return;
    const po = poReceiveMode.po;
    const batch = writeBatch(db);

    const updatedItems: PurchaseOrderItem[] = po.items.map((item, idx) => {
      const key = String(idx);
      const receiveQty = Number(partialReceiveValues[key] ?? 0);
      const remaining = item.amountOrdered - (item.amountReceived ?? 0);
      const applyQty = receiveQty > remaining ? remaining : receiveQty;
      if (applyQty > 0) {
        const inventoryItem = inventoryItems.find(
          (inv) =>
            inv.modelNumber === item.modelNumber &&
            inv.assignedBranchId === po.receivingWarehouseId
        );
        if (inventoryItem) {
          const invRef = doc(
            collection(db, `${basePath}/inventory`),
            inventoryItem.id
          );
          batch.update(invRef, {
            amountInInventory:
              Number(inventoryItem.amountInInventory) + applyQty,
          });
        } else {
          const id = crypto.randomUUID();
          const invRef = doc(collection(db, `${basePath}/inventory`), id);
          const template =
            inventoryItems.find(
              (inv) => inv.modelNumber === item.modelNumber
            ) ?? null;
          const newItem: InventoryItem = {
            id,
            modelNumber: item.modelNumber,
            name: item.itemName,
            category: item.category,
            amountInInventory: applyQty,
            numOnOrder: 0,
            manufactureName: po.manufacture,
            imageUrl: "",
            assignedBranchId: po.receivingWarehouseId,
            minStockLevel: template?.minStockLevel ?? 0,
          };
          batch.set(invRef, newItem);
        }
      }
      return {
        ...item,
        amountReceived: (item.amountReceived ?? 0) + applyQty,
      };
    });

    const allReceived = updatedItems.every(
      (it) => it.amountReceived >= it.amountOrdered
    );

    const poRef = doc(collection(db, `${basePath}/purchaseOrders`), po.id);

    if (allReceived) {
      const nowIso = new Date().toISOString();
      const historyRef = doc(collection(db, `${basePath}/poHistory`), po.id);
      const poReceived: PurchaseOrder = {
        ...po,
        items: updatedItems,
        status: "received",
        receivedDate: nowIso,
      };
      batch.set(historyRef, poReceived);
      batch.delete(poRef);
    } else {
      batch.update(poRef, {
        items: updatedItems,
      });
    }

    await batch.commit();
    setPoReceiveMode(null);
  };

  const handleCancelPo = async (po: PurchaseOrder) => {
    if (!db || !basePath) return;
    const confirmed = await messageBoxRef.current?.confirm(
      `Cancel PO ${po.orderNumber}?`
    );
    if (!confirmed) return;
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();
    const historyRef = doc(collection(db, `${basePath}/poHistory`), po.id);
    const poRef = doc(collection(db, `${basePath}/purchaseOrders`), po.id);
    const poDeleted: PurchaseOrder = {
      ...po,
      status: "deleted",
      deletedDate: nowIso,
    };
    batch.set(historyRef, poDeleted);
    batch.delete(poRef);
    await batch.commit();
  };

  const [transferForm, setTransferForm] = useState<{
    itemId: string;
    quantity: number;
    sourceBranchId: string;
    destinationBranchId: string;
  }>({
    itemId: "",
    quantity: 0,
    sourceBranchId: "",
    destinationBranchId: "",
  });

  const handleSaveTransfer = async () => {
    if (!db || !basePath) return;
    const { itemId, quantity, sourceBranchId, destinationBranchId } =
      transferForm;
    if (!itemId || !quantity || !sourceBranchId || !destinationBranchId) {
      messageBoxRef.current?.alert("Fill in required transfer fields.");
      return;
    }
    const item = inventoryItems.find((inv) => inv.id === itemId);
    if (!item) {
      messageBoxRef.current?.alert("Inventory item not found.");
      return;
    }
    if (item.assignedBranchId !== sourceBranchId) {
      messageBoxRef.current?.alert(
        "Source branch does not match selected inventory record."
      );
      return;
    }
    if (item.amountInInventory < quantity) {
      messageBoxRef.current?.alert(
        "Quantity to transfer exceeds available stock."
      );
      return;
    }

    const batch = writeBatch(db);

    const sourceRef = doc(collection(db, `${basePath}/inventory`), item.id);
    batch.update(sourceRef, {
      amountInInventory: item.amountInInventory - quantity,
    });

    const id = crypto.randomUUID();
    const transferRef = doc(collection(db, `${basePath}/moves`), id);
    const transfer: Transfer = {
      id,
      transferId: id,
      itemModelNumber: item.modelNumber,
      itemName: item.name,
      quantity,
      sourceBranchId,
      destinationBranchId,
      dateInitiated: new Date().toISOString(),
      status: "pending",
    };
    batch.set(transferRef, transfer);

    await batch.commit();
    setTransferModalOpen(false);
    setTransferForm({
      itemId: "",
      quantity: 0,
      sourceBranchId: "",
      destinationBranchId: "",
    });
  };

  const handleUpdateTransferStatus = async (
    transfer: Transfer,
    newStatus: TransferStatus
  ) => {
    if (!db || !basePath) return;
    if (newStatus === "in-transit" && transfer.status !== "pending") {
      return;
    }
    if (newStatus === "completed" && transfer.status === "completed") {
      return;
    }
    if (newStatus === "completed") {
      const confirmed = await messageBoxRef.current?.confirm(
        `Mark transfer ${transfer.transferId} as completed and update destination inventory?`
      );
      if (!confirmed) return;
      const batch = writeBatch(db);

      const destItem =
        inventoryItems.find(
          (inv) =>
            inv.modelNumber === transfer.itemModelNumber &&
            inv.assignedBranchId === transfer.destinationBranchId
        ) ?? null;

      if (destItem) {
        const destRef = doc(
          collection(db, `${basePath}/inventory`),
          destItem.id
        );
        batch.update(destRef, {
          amountInInventory: destItem.amountInInventory + transfer.quantity,
        });
      } else {
        const template =
          inventoryItems.find(
            (inv) => inv.modelNumber === transfer.itemModelNumber
          ) ?? null;
        const id = crypto.randomUUID();
        const destRef = doc(collection(db, `${basePath}/inventory`), id);
        const newItem: InventoryItem = {
          id,
          modelNumber: transfer.itemModelNumber,
          name: transfer.itemName,
          category: template?.category ?? "",
          amountInInventory: transfer.quantity,
          numOnOrder: 0,
          manufactureName: template?.manufactureName ?? "",
          imageUrl: template?.imageUrl ?? "",
          assignedBranchId: transfer.destinationBranchId,
          minStockLevel: template?.minStockLevel ?? 0,
        };
        batch.set(destRef, newItem);
      }

      const transferRef = doc(collection(db, `${basePath}/moves`), transfer.id);
      batch.update(transferRef, {
        status: "completed",
        dateCompleted: new Date().toISOString(),
      });
      await batch.commit();
    } else {
      const transferRef = doc(collection(db, `${basePath}/moves`), transfer.id);
      await updateDoc(transferRef, {
        status: newStatus,
      });
    }
  };

  const handleDeleteWarehouse = async (warehouse: Warehouse) => {
    if (!db || !basePath) return;
    const confirmed = await messageBoxRef.current?.confirm(
      `Delete warehouse ${warehouse.name}?`
    );
    if (!confirmed) return;
    const ref = doc(collection(db, `${basePath}/warehouses`), warehouse.id);
    await deleteDoc(ref);
  };

  const handleWarehouseCsvImport = async (file: File) => {
    if (!db || !basePath) return;
    const text = await file.text();
    const rows = parseCsvSimple(text);
    if (rows.length < 2) {
      messageBoxRef.current?.alert("CSV has no data rows.");
      return;
    }
    const header = rows[0].map((h) => h.toLowerCase());
    const idx = (name: string) => header.indexOf(name.toLowerCase());
    const batch = writeBatch(db);
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 0) continue;
      const name = row[idx("name")];
      if (!name) continue;
      const id = crypto.randomUUID();
      const ref = doc(collection(db, `${basePath}/warehouses`), id);
      const warehouse: Warehouse = {
        id,
        shortCode: row[idx("shortCode")] ?? row[idx("shortcode")] ?? "",
        name,
        streetAddress:
          row[idx("streetAddress")] ?? row[idx("streetaddress")] ?? "",
        city: row[idx("city")] ?? "",
        state: row[idx("state")] ?? "",
      };
      batch.set(ref, warehouse);
    }
    await batch.commit();
    messageBoxRef.current?.alert("Warehouse CSV import complete.");
  };

  const renderInventoryPage = () => {
    return (
      <div className="space-y-4">
        <DataTable<InventoryItem>
          title="Inventory"
          data={enrichedInventory}
          searchFields={["modelNumber", "name", "category", "manufactureName"]}
          filterFields={[
            {
              key: "assignedBranchId",
              label: "Warehouse",
              type: "select",
              options: warehouseSelectOptions,
            },
            {
              key: "category",
              label: "Category",
              type: "select",
              options: inventoryCategoryOptions,
            },
          ]}
          getRowId={(row) => row.id}
          columns={[
            {
              key: "modelNumber",
              label: "Item",
              render: (row) => (
                <div className="flex items-center gap-3">
                  {row.imageUrl ? (
                    <img
                      src={row.imageUrl}
                      alt={row.name || row.modelNumber}
                      className="w-10 h-10 rounded-md object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600">
                      {(row.modelNumber || "").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-900">
                      {row.modelNumber}
                    </span>
                    <span className="text-[11px] text-slate-600">
                      {row.name}
                    </span>
                  </div>
                </div>
              ),
            },
            { key: "category", label: "Category" },
            {
              key: "assignedBranchId",
              label: "Warehouse",
              render: (row) => {
                const wh = warehouses.find(
                  (w) => w.id === row.assignedBranchId
                );
                return wh ? wh.shortCode || wh.name : row.assignedBranchId;
              },
            },
            {
              key: "amountInInventory",
              label: "On Hand",
            },
            {
              key: "numOnOrder",
              label: "On Order",
            },
            {
              key: "minStockLevel",
              label: "Stock Level (Min)",
              render: (row) => {
                const ratio = `${row.amountInInventory} / ${row.minStockLevel}`;
                let color = "bg-green-100 text-green-800";
                if (row.amountInInventory < row.minStockLevel) {
                  color = "bg-red-100 text-red-800";
                } else if (row.amountInInventory === row.minStockLevel) {
                  color = "bg-yellow-100 text-yellow-800";
                }
                return (
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${color}`}
                  >
                    {ratio}
                  </span>
                );
              },
            },
          ]}
          actions={(row) => (
            <button
              className="px-2 py-1 rounded-md bg-slate-100 text-xs text-slate-800 hover:bg-slate-200"
              onClick={() => openInventoryModalForEdit(row)}
            >
              Edit
            </button>
          )}
        >
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-md bg-[#005691] text-white text-xs sm:text-sm hover:bg-[#00426e]"
              onClick={openInventoryModalForNew}
            >
              Add Inventory
            </button>
            <button
              className="px-3 py-2 rounded-md border border-[#005691] text-[#005691] text-xs sm:text-sm hover:bg-[#005691]/5"
              onClick={() => setInventoryCsvModalOpen(true)}
            >
              Import Inventory (CSV)
            </button>
          </div>
        </DataTable>

        <Modal
          open={inventoryModalOpen}
          onClose={() => setInventoryModalOpen(false)}
          title={
            editingInventoryItem ? "Edit Inventory Item" : "Add Inventory Item"
          }
          footer={
            <div className="flex justify-between gap-3">
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-slate-300 text-xs sm:text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setWarehouseModalQuickOpen(true)}
              >
                Quick Add Warehouse
              </button>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setInventoryModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-[#005691] text-sm text-white hover:bg-[#00426e]"
                  onClick={handleSaveInventory}
                >
                  Save
                </button>
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Model Number
              </label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={inventoryForm.modelNumber ?? ""}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    modelNumber: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Name
              </label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={inventoryForm.name ?? ""}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Category
              </label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={inventoryForm.category ?? ""}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Manufacture
              </label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={inventoryForm.manufactureName ?? ""}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    manufactureName: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Warehouse
              </label>
              <select
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={inventoryForm.assignedBranchId ?? ""}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    assignedBranchId: e.target.value,
                  }))
                }
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.shortCode || w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Amount In Inventory
              </label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={inventoryForm.amountInInventory ?? 0}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    amountInInventory: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Min Stock Level
              </label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={inventoryForm.minStockLevel ?? 0}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    minStockLevel: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Image URL
              </label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={inventoryForm.imageUrl ?? ""}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    imageUrl: e.target.value,
                  }))
                }
              />
            </div>
          </div>
        </Modal>

        <Modal
          open={inventoryCsvModalOpen}
          onClose={() => setInventoryCsvModalOpen(false)}
          title="Import Inventory from CSV"
          footer={
            <button
              className="px-4 py-2 rounded-md bg-[#005691] text-sm text-white hover:bg-[#00426e]"
              onClick={() => {
                if (inventoryCsvInputRef.current) {
                  inventoryCsvInputRef.current.value = "";
                  inventoryCsvInputRef.current.click();
                }
              }}
            >
              Select CSV File
            </button>
          }
        >
          <p className="text-sm text-slate-700 mb-2">
            Upload a CSV file with headers such as modelNumber, name, category,
            amountInInventory, manufactureName, imageUrl, assignedBranchId,
            minStockLevel.
          </p>
          <input
            ref={inventoryCsvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleInventoryCsvImport(file);
              }
            }}
          />
        </Modal>
      </div>
    );
  };

  const renderPendingPoPage = () => {
    return (
      <div className="space-y-4">
        <DataTable<PurchaseOrder>
          title="Purchase Orders (Pending)"
          data={pendingPOs}
          searchFields={["orderNumber", "vendor", "manufacture"]}
          filterFields={[
            {
              key: "receivingWarehouseId",
              label: "Warehouse",
              type: "select",
              options: warehouseSelectOptions,
            },
            {
              key: "vendor",
              label: "Vendor",
              type: "select",
              options: poVendorOptions,
            },
            {
              key: "manufacture",
              label: "Manufacture",
              type: "select",
              options: poManufactureOptions,
            },
            {
              key: "totalCost",
              label: "Total Cost",
              render: (row) => {
                const total = row.items.reduce(
                  (sum, it) =>
                    sum + (it.orderCost || 0) * (it.amountOrdered || 0),
                  0
                );
                return `$${total.toFixed(2)}`;
              },
            },
          ]}
          getRowId={(row) => row.id}
          columns={[
            { key: "orderNumber", label: "PO Number" },
            { key: "vendor", label: "Vendor" },
            { key: "manufacture", label: "Manufacture" },
            {
              key: "receivingWarehouseId",
              label: "Receiving Warehouse",
              render: (row) => {
                const wh = warehouses.find(
                  (w) => w.id === row.receivingWarehouseId
                );
                return wh ? wh.shortCode || wh.name : row.receivingWarehouseId;
              },
            },
            {
              key: "orderDate",
              label: "Order Date",
              render: (row) =>
                row.orderDate
                  ? new Date(row.orderDate).toLocaleDateString()
                  : "",
            },
            {
              key: "status",
              label: "Status",
            },
          ]}
          actions={(row) => (
            <div className="flex gap-1 justify-end">
              <button
                className="px-2 py-1 rounded-md bg-slate-100 text-xs hover:bg-slate-200"
                onClick={() => openPoModalForEdit(row)}
              >
                Edit
              </button>
              <button
                className="px-2 py-1 rounded-md bg-emerald-100 text-xs text-emerald-800 hover:bg-emerald-200"
                onClick={() => setPoReceiveMode({ po: row, mode: "full" })}
              >
                Receive
              </button>
              <button
                className="px-2 py-1 rounded-md bg-amber-100 text-xs text-amber-800 hover:bg-amber-200"
                onClick={() => openPartialReceiveModal(row)}
              >
                Partial
              </button>
              <button
                className="px-2 py-1 rounded-md bg-red-100 text-xs text-red-800 hover:bg-red-200"
                onClick={() => handleCancelPo(row)}
              >
                Cancel
              </button>
            </div>
          )}
        >
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-md bg-[#005691] text-white text-xs sm:text-sm hover:bg-[#00426e]"
              onClick={openPoModalForNew}
            >
              Add New PO
            </button>
          </div>
        </DataTable>

        <Modal
          open={poModalOpen}
          onClose={() => setPoModalOpen(false)}
          title={editingPO ? "Edit Purchase Order" : "Add Purchase Order"}
          maxWidthClass="max-w-4xl"
          footer={
            <div className="flex justify-between gap-3">
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-slate-300 text-xs sm:text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setWarehouseModalQuickOpen(true)}
              >
                Quick Add Warehouse
              </button>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setPoModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 rounded-md bg-[#005691] text-sm text-white hover:bg-[#00426e]"
                  onClick={handleSavePurchaseOrder}
                >
                  Save
                </button>
              </div>
            </div>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                PO Number
              </label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={poForm.orderNumber ?? ""}
                onChange={(e) =>
                  setPoForm((prev) => ({
                    ...prev,
                    orderNumber: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Vendor
              </label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={poForm.vendor ?? ""}
                onChange={(e) =>
                  setPoForm((prev) => ({
                    ...prev,
                    vendor: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Manufacture
              </label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={poForm.manufacture ?? ""}
                onChange={(e) =>
                  setPoForm((prev) => ({
                    ...prev,
                    manufacture: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Receiving Warehouse
              </label>
              <select
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={poForm.receivingWarehouseId ?? ""}
                onChange={(e) =>
                  setPoForm((prev) => ({
                    ...prev,
                    receivingWarehouseId: e.target.value,
                  }))
                }
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.shortCode || w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">
                Line Items
              </h3>
              <button
                type="button"
                className="px-2 py-1 rounded-md bg-slate-100 text-xs hover:bg-slate-200"
                onClick={handleAddPoLineItem}
              >
                Add Line
              </button>
            </div>
            <div className="border border-slate-200 rounded-md overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-2 text-left">Item Name</th>
                    <th className="px-2 py-2 text-left">Model #</th>
                    <th className="px-2 py-2 text-left">Category</th>
                    <th className="px-2 py-2 text-right">Qty Ordered</th>
                    <th className="px-2 py-2 text-right">Cost</th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {(poForm.items ?? []).map((item, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-2 py-1">
                        <input
                          className="w-full border border-slate-200 rounded-md px-2 py-1"
                          value={item.itemName}
                          onChange={(e) =>
                            handleUpdatePoLineItem(
                              idx,
                              "itemName",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full border border-slate-200 rounded-md px-2 py-1"
                          value={item.modelNumber}
                          onChange={(e) =>
                            handleUpdatePoLineItem(
                              idx,
                              "modelNumber",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full border border-slate-200 rounded-md px-2 py-1"
                          value={item.category}
                          onChange={(e) =>
                            handleUpdatePoLineItem(
                              idx,
                              "category",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <input
                          type="number"
                          className="w-20 border border-slate-200 rounded-md px-2 py-1 text-right"
                          value={item.amountOrdered}
                          onChange={(e) =>
                            handleUpdatePoLineItem(
                              idx,
                              "amountOrdered",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <input
                          type="number"
                          className="w-24 border border-slate-200 rounded-md px-2 py-1 text-right"
                          value={item.orderCost}
                          onChange={(e) =>
                            handleUpdatePoLineItem(
                              idx,
                              "orderCost",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <button
                          type="button"
                          className="px-2 py-1 rounded-md bg-red-100 text-red-800 hover:bg-red-200"
                          onClick={() => handleRemovePoLineItem(idx)}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(poForm.items ?? []).length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-2 py-3 text-center text-slate-500"
                      >
                        No line items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>

        <Modal
          open={!!poReceiveMode && poReceiveMode.mode === "full"}
          onClose={() => setPoReceiveMode(null)}
          title="Receive Remaining Items in Full"
        >
          {poReceiveMode && (
            <div className="space-y-4">
              <p className="text-sm text-slate-700">
                Receive all remaining quantities for PO{" "}
                <span className="font-semibold">
                  {poReceiveMode.po.orderNumber}
                </span>
                .
              </p>
              <button
                className="px-4 py-2 rounded-md bg-[#005691] text-sm text-white hover:bg-[#00426e]"
                onClick={() => handleReceivePoFull(poReceiveMode.po)}
              >
                Confirm Receive
              </button>
            </div>
          )}
        </Modal>

        <Modal
          open={!!poReceiveMode && poReceiveMode.mode === "partial"}
          onClose={() => setPoReceiveMode(null)}
          title="Receive by Line Item"
          maxWidthClass="max-w-3xl"
          footer={
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setPoReceiveMode(null)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-[#005691] text-sm text-white hover:bg-[#00426e]"
                onClick={handleSubmitPartialReceive}
              >
                Save
              </button>
            </div>
          }
        >
          {poReceiveMode && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-2 text-left">Item</th>
                    <th className="px-2 py-2 text-left">Model #</th>
                    <th className="px-2 py-2 text-right">Ordered</th>
                    <th className="px-2 py-2 text-right">Received</th>
                    <th className="px-2 py-2 text-right">Remaining</th>
                    <th className="px-2 py-2 text-right">Receive Now</th>
                  </tr>
                </thead>
                <tbody>
                  {poReceiveMode.po.items.map((item, idx) => {
                    const remaining =
                      item.amountOrdered - (item.amountReceived ?? 0);
                    return (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-2 py-1">{item.itemName}</td>
                        <td className="px-2 py-1">{item.modelNumber}</td>
                        <td className="px-2 py-1 text-right">
                          {item.amountOrdered}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {item.amountReceived ?? 0}
                        </td>
                        <td className="px-2 py-1 text-right">{remaining}</td>
                        <td className="px-2 py-1 text-right">
                          <input
                            type="number"
                            className="w-20 border border-slate-200 rounded-md px-2 py-1 text-right"
                            value={partialReceiveValues[String(idx)] ?? 0}
                            onChange={(e) =>
                              setPartialReceiveValues((prev) => ({
                                ...prev,
                                [String(idx)]: Number(e.target.value),
                              }))
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Modal>
      </div>
    );
  };

  const renderPoHistoryPage = () => {
    return (
      <DataTable<PurchaseOrder>
        title="Purchase Order History"
        data={poHistory}
        searchFields={["orderNumber", "vendor", "manufacture"]}
        filterFields={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: poHistoryStatusOptions,
          },
          {
            key: "vendor",
            label: "Vendor",
            type: "select",
            options: poVendorOptions,
          },
          {
            key: "manufacture",
            label: "Manufacture",
            type: "select",
            options: poManufactureOptions,
          },
        ]}
        getRowId={(row) => row.id}
        columns={[
          { key: "orderNumber", label: "PO Number" },
          { key: "vendor", label: "Vendor" },
          { key: "manufacture", label: "Manufacture" },
          {
            key: "status",
            label: "Status",
          },
          {
            key: "orderDate",
            label: "Order Date",
            render: (row) =>
              row.orderDate ? new Date(row.orderDate).toLocaleDateString() : "",
          },
          {
            key: "receivedDate",
            label: "Received Date",
            render: (row) =>
              row.receivedDate
                ? new Date(row.receivedDate).toLocaleDateString()
                : "",
          },
          {
            key: "deletedDate",
            label: "Deleted Date",
            render: (row) =>
              row.deletedDate
                ? new Date(row.deletedDate).toLocaleDateString()
                : "",
          },
        ]}
      />
    );
  };

  const renderTransfersPage = () => {
    return (
      <div className="space-y-4">
        <DataTable<Transfer>
          title="Transfers"
          data={transfers}
          searchFields={[
            "transferId",
            "itemModelNumber",
            "itemName",
            "sourceBranchId",
            "destinationBranchId",
          ]}
          filterFields={[
            {
              key: "status",
              label: "Status",
              type: "select",
              options: transferStatusOptions,
            },
            {
              key: "sourceBranchId",
              label: "Source",
              type: "select",
              options: transferSourceOptions,
            },
            {
              key: "destinationBranchId",
              label: "Destination",
              type: "select",
              options: transferDestinationOptions,
            },
          ]}
          getRowId={(row) => row.id}
          columns={[
            { key: "transferId", label: "Transfer ID" },
            { key: "itemModelNumber", label: "Model #" },
            { key: "itemName", label: "Item Name" },
            {
              key: "sourceBranchId",
              label: "Source",
              render: (row) => {
                const wh = warehouses.find((w) => w.id === row.sourceBranchId);
                return wh ? wh.shortCode || wh.name : row.sourceBranchId;
              },
            },
            {
              key: "destinationBranchId",
              label: "Destination",
              render: (row) => {
                const wh = warehouses.find(
                  (w) => w.id === row.destinationBranchId
                );
                return wh ? wh.shortCode || wh.name : row.destinationBranchId;
              },
            },
            {
              key: "quantity",
              label: "Qty",
            },
            {
              key: "status",
              label: "Status",
            },
          ]}
          actions={(row) => (
            <div className="flex gap-1 justify-end">
              {row.status === "pending" && (
                <button
                  className="px-2 py-1 rounded-md bg-amber-100 text-xs text-amber-800 hover:bg-amber-200"
                  onClick={() => handleUpdateTransferStatus(row, "in-transit")}
                >
                  In-Transit
                </button>
              )}
              {(row.status === "pending" || row.status === "in-transit") && (
                <button
                  className="px-2 py-1 rounded-md bg-emerald-100 text-xs text-emerald-800 hover:bg-emerald-200"
                  onClick={() => handleUpdateTransferStatus(row, "completed")}
                >
                  Completed
                </button>
              )}
            </div>
          )}
        >
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-md bg-[#005691] text-white text-xs sm:text-sm hover:bg-[#00426e]"
              onClick={() => setTransferModalOpen(true)}
            >
              Initiate New Transfer
            </button>
          </div>
        </DataTable>

        <Modal
          open={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          title="Initiate Transfer"
          footer={
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setTransferModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-[#005691] text-sm text-white hover:bg-[#00426e]"
                onClick={handleSaveTransfer}
              >
                Save
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Item
              </label>
              <select
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={transferForm.itemId}
                onChange={(e) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    itemId: e.target.value,
                  }))
                }
              >
                <option value="">Select Item</option>
                {inventoryItems.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.modelNumber} - {inv.name} ({inv.amountInInventory} on
                    hand)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Quantity
              </label>
              <input
                type="number"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={transferForm.quantity}
                onChange={(e) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    quantity: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Source Warehouse
              </label>
              <select
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={transferForm.sourceBranchId}
                onChange={(e) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    sourceBranchId: e.target.value,
                  }))
                }
              >
                <option value="">Select Source</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.shortCode || w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Destination Warehouse
              </label>
              <select
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={transferForm.destinationBranchId}
                onChange={(e) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    destinationBranchId: e.target.value,
                  }))
                }
              >
                <option value="">Select Destination</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.shortCode || w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Modal>
      </div>
    );
  };

  const renderWarehousesPage = () => {
    return (
      <div className="space-y-4">
        <DataTable<Warehouse>
          title="Warehouses"
          data={warehouses}
          searchFields={["shortCode", "name", "city", "state"]}
          filterFields={[
            {
              key: "state",
              label: "State",
              type: "select",
              options: warehouseStateOptions,
            },
          ]}
          getRowId={(row) => row.id}
          columns={[
            { key: "shortCode", label: "Code" },
            { key: "name", label: "Name" },
            { key: "streetAddress", label: "Address" },
            { key: "city", label: "City" },
            { key: "state", label: "State" },
          ]}
          actions={(row) => (
            <div className="flex gap-1 justify-end">
              <button
                className="px-2 py-1 rounded-md bg-slate-100 text-xs hover:bg-slate-200"
                onClick={() => {
                  setEditingWarehouse(row);
                  setWarehouseModalMainOpen(true);
                }}
              >
                Edit
              </button>
              <button
                className="px-2 py-1 rounded-md bg-red-100 text-xs text-red-800 hover:bg-red-200"
                onClick={() => handleDeleteWarehouse(row)}
              >
                Delete
              </button>
            </div>
          )}
        >
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-md bg-[#005691] text-white text-xs sm:text-sm hover:bg-[#00426e]"
              onClick={() => {
                setEditingWarehouse(null);
                setWarehouseModalMainOpen(true);
              }}
            >
              Add Warehouse
            </button>
            <button
              className="px-3 py-2 rounded-md border border-[#005691] text-[#005691] text-xs sm:text-sm hover:bg-[#005691]/5"
              onClick={() => setWarehouseCsvModalOpen(true)}
            >
              Import Warehouses (CSV)
            </button>
          </div>
        </DataTable>

        <AddWarehouseModal
          open={warehouseModalMainOpen}
          onClose={() => setWarehouseModalMainOpen(false)}
          onSaved={() => {}}
          db={db!}
          basePath={basePath!}
          existing={editingWarehouse}
        />

        <Modal
          open={warehouseCsvModalOpen}
          onClose={() => setWarehouseCsvModalOpen(false)}
          title="Import Warehouses from CSV"
          footer={
            <button
              className="px-4 py-2 rounded-md bg-[#005691] text-sm text-white hover:bg-[#00426e]"
              onClick={() => {
                if (warehouseCsvInputRef.current) {
                  warehouseCsvInputRef.current.value = "";
                  warehouseCsvInputRef.current.click();
                }
              }}
            >
              Select CSV File
            </button>
          }
        >
          <p className="text-sm text-slate-700 mb-2">
            Upload a CSV file with headers such as shortCode, name,
            streetAddress, city, state.
          </p>
          <input
            ref={warehouseCsvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleWarehouseCsvImport(file);
              }
            }}
          />
        </Modal>
      </div>
    );
  };

  if (!authInitDone || !firebaseApp || !db || !authUser || !basePath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col">
      <header className="bg-[#005691] text-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold">
              BLX
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-semibold">
                INVENTORY WMS
              </h1>
              <p className="text-[11px] text-white/80">
                App ID: {appId} · User: {authUser.uid.slice(0, 8)}
              </p>
            </div>
          </div>
          <nav className="flex gap-1 sm:gap-2 text-xs sm:text-sm">
            <NavButton
              label="Inventory"
              active={page === "inventory"}
              onClick={() => setPage("inventory")}
            />
            <NavButton
              label="Purchase Orders"
              active={page === "pos"}
              onClick={() => setPage("pos")}
            />
            <NavButton
              label="PO History"
              active={page === "poHistory"}
              onClick={() => setPage("poHistory")}
            />
            <NavButton
              label="Transfers"
              active={page === "transfers"}
              onClick={() => setPage("transfers")}
            />
            <NavButton
              label="Warehouses"
              active={page === "warehouses"}
              onClick={() => setPage("warehouses")}
            />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 space-y-4">
        {(loadingInventory ||
          loadingWarehouses ||
          loadingPOs ||
          loadingPoHistory ||
          loadingTransfers) && <LoadingSpinner />}
        {page === "inventory" && renderInventoryPage()}
        {page === "pos" && renderPendingPoPage()}
        {page === "poHistory" && renderPoHistoryPage()}
        {page === "transfers" && renderTransfersPage()}
        {page === "warehouses" && renderWarehousesPage()}
      </main>

      <AddWarehouseModal
        open={warehouseModalQuickOpen}
        onClose={() => setWarehouseModalQuickOpen(false)}
        onSaved={() => {}}
        db={db}
        basePath={basePath}
      />

      <MessageBox ref={messageBoxRef} />
    </div>
  );
};

interface NavButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ label, active, onClick }) => (
  <button
    className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
      active ? "bg-white text-[#005691]" : "text-white/80 hover:bg-white/10"
    }`}
    onClick={onClick}
  >
    {label}
  </button>
);

export default App;
