import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";

import { initializeApp, getApps } from "firebase/app";
import type { FirebaseApp } from "firebase/app";

import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import type { User } from "firebase/auth";
import { AuthPage } from "./AuthPage";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { DataTable } from "./components/DataTable";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { MessageBox, type MessageBoxHandle } from "./components/MessageBox";
import { Modal } from "./components/Modal";
import { useCollection } from "./hooks/useCollection";
import {
  buildBasePath,
  jsonSafeParse,
  parseCsvSimple,
} from "./utils/helpers";

type PageKey =
  | "inventory"
  | "pos"
  | "poHistory"
  | "transfers"
  | "warehouses"
  | "activityHistory";

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
  upc?: string;
  modelNumber: string;
  name: string;
  category: string;
  tags?: string[];
  description?: string;
  amountInInventory: number;
  numOnOrder: number;
  manufactureName: string;
  manufacturePartNumber: string;
  imageUrl: string;
  assignedBranchId: string;
  minStockLevel: number;
}

interface PurchaseOrderItem {
  upc?: string;
  itemName: string;
  modelNumber: string;
  amountOrdered: number;
  category: string;
  orderCost: number;
  amountReceived: number;
  imageUrl?: string;
  description?: string;
  manufactureName?: string;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  ipNumber?: string;
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
  ipNumber?: string;
  vendor: string;
  manufacture: string;
  receivingWarehouseId: string;
  items: PurchaseOrderItem[];
}

const makeEmptyPoForm = (): PoFormState => ({
  orderNumber: "",
  ipNumber: "",
  vendor: "",
  manufacture: "",
  receivingWarehouseId: "",
  items: [
    {
      upc: "",
      itemName: "",
      modelNumber: "",
      amountOrdered: 0,
      category: "",
      orderCost: 0,
      amountReceived: 0,
      imageUrl: "",
      description: "",
      manufactureName: "",
    },
  ],
});

type TransferStatus = "pending" | "in-transit" | "completed" | "cancelled";

interface TransferLine {
  itemId: string;
  itemModelNumber: string;
  itemName: string;
  quantity: number;
}

interface Transfer {
  id: string;
  transferId: string;
  label?: string;
  trackingNumber?: string;
  sourceBranchId: string;
  destinationBranchId: string;
  dateInitiated: string;
  status: TransferStatus;
  dateCompleted?: string;
  statusUpdatedAt?: string;
  lines: TransferLine[];
}

interface ActivityLog {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  collection: string;
  docId?: string;
  summary: string;
}

interface AddWarehouseModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (warehouse: Warehouse) => void;
  db: Firestore;
  basePath: string;
  existing?: Warehouse | null;
  onLogActivity: (
    entry: Omit<ActivityLog, "id" | "timestamp" | "userName">
  ) => Promise<void>;
}

const AddWarehouseModal: React.FC<AddWarehouseModalProps> = ({
  open,
  onClose,
  onSaved,
  db,
  basePath,
  existing,
  onLogActivity,
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
    await onLogActivity({
      action: existing ? "warehouse_update" : "warehouse_create",
      collection: "warehouses",
      docId: id,
      summary: `${existing ? "Updated" : "Created"} warehouse ${
        warehouse.name
      }`,
    });
    setSaving(false);
    onSaved(warehouse);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? "Edit Branch" : "Add Branch"}
      footer={
        <div className="flex justify-end gap-3">
          <button
            className="px-4 py-2 rounded-md bg-[#FF6347] text-sm text-white hover:bg-[#e4573d]"
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
            Short Code <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Name <span className="text-red-500">*</span>
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

const App: React.FC = () => {
  const [firebaseApp, setFirebaseApp] = useState<FirebaseApp | null>(null);
  const [db, setDb] = useState<Firestore | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [appId, setAppId] = useState<string>("wms-app-prod");
  const [authInitDone, setAuthInitDone] = useState(false);
  const [page, setPage] = useState<PageKey>("inventory");
  const [isDark, setIsDark] = useState(false);
  const [defaultWarehouseId, setDefaultWarehouseId] = useState<string | null>(
    null
  );

  const messageBoxRef = useRef<MessageBoxHandle>(null);
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<string[]>(
    []
  );

  const basePath = useMemo(
    () => (appId ? buildBasePath(appId) : null),
    [appId]
  );

  const getUserName = useCallback(() => {
    const name = authUser?.displayName?.trim();
    if (name) return name;
    const email = authUser?.email?.trim();
    if (email) return email;
    return authUser?.uid || "Unknown User";
  }, [authUser]);

  const getDefaultWarehouseStorageKey = useCallback(
    (uid?: string | null) => `defaultWarehouseId:${uid ?? "anon"}`,
    []
  );

  const logActivity = useCallback(
    async (entry: Omit<ActivityLog, "id" | "timestamp" | "userName">) => {
      if (!db || !basePath || !authUser) return;
      const payload: ActivityLog = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        userName: getUserName(),
      };
      try {
        await setDoc(
          doc(collection(db, `${basePath}/activityHistory`), payload.id),
          payload
        );
      } catch (err) {
        console.error("Failed to log activity", err);
      }
    },
    [db, basePath, authUser, getUserName]
  );

  useEffect(() => {
    console.log("DEBUG basePath", basePath);
    console.log("DEBUG appId", appId);
    console.log("DEBUG authUser uid", authUser?.uid);
  }, [basePath, appId, authUser]);

  // Theme Init: Runs once on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("wms-theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      setIsDark(true);
    }
  }, []);

  // Theme Application: Runs whenever isDark changes
  useEffect(() => {
    if (isDark) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
    localStorage.setItem("wms-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    if (!authInitDone) return;
    if (!authUser) {
      setDefaultWarehouseId(null);
      return;
    }
    const stored = localStorage.getItem(
      getDefaultWarehouseStorageKey(authUser.uid)
    );
    setDefaultWarehouseId(stored || null);
  }, [authInitDone, authUser, getDefaultWarehouseStorageKey]);

  useEffect(() => {
    if (!authUser) return;
    const storageKey = getDefaultWarehouseStorageKey(authUser.uid);
    if (defaultWarehouseId) {
      localStorage.setItem(storageKey, defaultWarehouseId);
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [defaultWarehouseId, authUser, getDefaultWarehouseStorageKey]);

  useEffect(() => {
    const w = window as any;
    const cfg = jsonSafeParse(w.__firebase_config);
    const appIdGlobal = w.__app_id as string | undefined;

    if (!cfg) {
      console.error("Missing firebase config");
      return;
    }

    if (appIdGlobal) {
      setAppId(appIdGlobal);
    } else {
      console.warn("No __app_id found, using default 'wms-app-prod'");
    }

    let app: FirebaseApp;
    if (getApps().length === 0) {
      app = initializeApp(cfg);
    } else {
      app = getApps()[0] as FirebaseApp;
    }

    setFirebaseApp(app);
    const auth = getAuth(app);

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
        setDb(getFirestore(app));
      } else {
        setAuthUser(null);
        setDb(null);
      }
      setAuthInitDone(true);
    });

    return () => unsub();
  }, []);

  const handleSignOut = async () => {
    const auth = getAuth();
    await signOut(auth);
    setAuthUser(null);
    setDb(null);
  };

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

  const { data: activityHistory, loading: loadingActivity } =
    useCollection<ActivityLog>({
      db,
      basePath,
      collectionName: "activityHistory",
    });

  useEffect(() => {
    if (
      defaultWarehouseId &&
      !warehouses.some((w) => w.id === defaultWarehouseId)
    ) {
      setDefaultWarehouseId(null);
    }
  }, [defaultWarehouseId, warehouses]);

  const activityFilterOptions = useMemo(() => {
    const actionSet = new Set<string>();
    const userSet = new Set<string>();
    activityHistory.forEach((entry) => {
      if (entry.action) actionSet.add(entry.action);
      if (entry.userName) userSet.add(entry.userName);
    });
    return {
      actions: Array.from(actionSet).map((value) => ({
        label: value,
        value,
      })),
      users: Array.from(userSet).map((value) => ({ label: value, value })),
    };
  }, [activityHistory]);

  const filteredPurchaseOrders = useMemo(
    () =>
      defaultWarehouseId
        ? purchaseOrders.filter(
            (po) => po.receivingWarehouseId === defaultWarehouseId
          )
        : purchaseOrders,
    [defaultWarehouseId, purchaseOrders]
  );

  const filteredPoHistory = useMemo(
    () =>
      defaultWarehouseId
        ? poHistory.filter(
            (po) => po.receivingWarehouseId === defaultWarehouseId
          )
        : poHistory,
    [defaultWarehouseId, poHistory]
  );

  const filteredTransfers = useMemo(
    () =>
      defaultWarehouseId
        ? transfers.filter(
            (t) =>
              t.sourceBranchId === defaultWarehouseId ||
              t.destinationBranchId === defaultWarehouseId
          )
        : transfers,
    [defaultWarehouseId, transfers]
  );

  const pendingPOs = useMemo(
    () => filteredPurchaseOrders.filter((po) => po.status === "pending"),
    [filteredPurchaseOrders]
  );

  const onOrderMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const po of pendingPOs) {
      for (const item of po.items) {
        const remaining = item.amountOrdered - (item.amountReceived ?? 0);
        if (remaining > 0) {
          const key = `${po.receivingWarehouseId}:${item.modelNumber}`;
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
        numOnOrder:
          onOrderMap.get(
            `${item.assignedBranchId}:${item.manufacturePartNumber}`
          ) ?? 0,
      })),
    [inventoryItems, onOrderMap]
  );

  const filteredInventory = useMemo(
    () =>
      defaultWarehouseId
        ? enrichedInventory.filter(
            (item) => item.assignedBranchId === defaultWarehouseId
          )
        : enrichedInventory,
    [defaultWarehouseId, enrichedInventory]
  );

  const sortedWarehouses = useMemo(
    () =>
      [...warehouses].sort((a, b) =>
        (a.shortCode || a.name || "").localeCompare(
          b.shortCode || b.name || "",
          undefined,
          { sensitivity: "base" }
        )
      ),
    [warehouses]
  );

  const warehouseSelectOptions = useMemo(
    () =>
      sortedWarehouses.map((w) => ({
        label: w.shortCode || w.name,
        value: w.id,
      })),
    [sortedWarehouses]
  );

  const inventoryCategoryOptions = useMemo(() => {
    const set = new Set<string>();
    enrichedInventory.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).map((c) => ({ label: c, value: c }));
  }, [enrichedInventory]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  const poVendorOptions = useMemo(() => {
    const set = new Set<string>();
    purchaseOrders.forEach((po) => {
      if (po.vendor) set.add(po.vendor);
    });
    return Array.from(set).map((v) => ({ label: v, value: v }));
  }, [purchaseOrders]);

  const poIpNumberOptions = useMemo(() => {
    const set = new Set<string>();
    purchaseOrders.forEach((po) => {
      if (po.ipNumber) set.add(po.ipNumber);
    });
    return Array.from(set).map((ip) => ({ label: ip, value: ip }));
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

  const poHistoryIpNumberOptions = useMemo(() => {
    const set = new Set<string>();
    poHistory.forEach((po) => {
      if (po.ipNumber) set.add(po.ipNumber);
    });
    return Array.from(set).map((ip) => ({ label: ip, value: ip }));
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
  const inventoryImageInputRef = useRef<HTMLInputElement | null>(null);

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
  const [transferTrackingModalOpen, setTransferTrackingModalOpen] =
    useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [transferTrackingValue, setTransferTrackingValue] = useState("");

  const [inventoryForm, setInventoryForm] = useState<Partial<InventoryItem>>({
    upc: "",
    modelNumber: "",
    name: "",
    category: "",
    tags: [],
    description: "",
    amountInInventory: 0,
    manufactureName: "",
    manufacturePartNumber: "",
    imageUrl: "",
    assignedBranchId: "",
    minStockLevel: 0,
  });
  const [categorySearch, setCategorySearch] = useState("");
  useEffect(() => {
    setCategorySearch(inventoryForm.category ?? "");
  }, [inventoryForm.category]);
  const filteredCategoryOptions = useMemo(
    () =>
      inventoryCategoryOptions.filter((opt) =>
        opt.value.toLowerCase().includes((categorySearch ?? "").toLowerCase())
      ),
    [inventoryCategoryOptions, categorySearch]
  );

  const resetInventoryForm = () => {
    setInventoryForm({
      upc: "",
      modelNumber: "",
      name: "",
      category: "",
      tags: [],
      description: "",
      amountInInventory: 0,
      manufactureName: "",
      manufacturePartNumber: "",
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
      upc,
      modelNumber,
      name,
      category,
      tags,
      description,
      amountInInventory,
      manufactureName,
      manufacturePartNumber,
      imageUrl,
      assignedBranchId,
      minStockLevel,
    } = inventoryForm;
    if (
      !modelNumber ||
      !name ||
      !category ||
      !assignedBranchId ||
      !manufactureName ||
      !manufacturePartNumber ||
      minStockLevel === undefined ||
      amountInInventory === undefined
    ) {
      messageBoxRef.current?.alert(
        "Fill in all required inventory fields (Model Number, Name, Category, Manufacture, Manufacture Part Number, Branch, Amount In Inventory, Min Stock Level)."
      );
      return;
    }
    const id = editingInventoryItem?.id ?? crypto.randomUUID();
    const ref = doc(collection(db, `${basePath}/inventory`), id);
    const payload: InventoryItem = {
      id,
      upc: String(upc ?? ""),
      modelNumber: String(modelNumber),
      name: String(name),
      category: String(category),
      tags: Array.isArray(tags)
        ? tags
        : String(tags ?? "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
      description: String(description ?? ""),
      amountInInventory: Number(amountInInventory),
      numOnOrder: 0,
      manufactureName: String(manufactureName ?? ""),
      manufacturePartNumber: String(manufacturePartNumber ?? ""),
      imageUrl: String(imageUrl ?? ""),
      assignedBranchId: String(assignedBranchId),
      minStockLevel: Number(minStockLevel),
    };
    await setDoc(ref, payload);
    await logActivity({
      action: editingInventoryItem ? "inventory_update" : "inventory_create",
      collection: "inventory",
      docId: id,
      summary: `${
        editingInventoryItem ? "Updated" : "Added"
      } inventory ${name} (${modelNumber})`,
    });
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
        row[idx("modelnumber")] ?? row[idx("modelNumber".toLowerCase())];
      if (!modelNumber) continue;
      const id = crypto.randomUUID();
      const ref = doc(collection(db, `${basePath}/inventory`), id);
      const item: InventoryItem = {
        id,
        modelNumber,
        name: row[idx("name")] ?? "",
        category: row[idx("category")] ?? "",
        upc: row[idx("upc")] ?? "",
        amountInInventory: Number(
          row[idx("amountininventory")] ?? row[idx("amountInInventory")] ?? 0
        ),
        numOnOrder: 0,
        manufactureName:
          row[idx("manufacturename")] ?? row[idx("manufactureName")] ?? "",
        manufacturePartNumber:
          row[idx("manufacturepartnumber")] ??
          row[idx("manufacturePartNumber")] ??
          "",
        description: row[idx("description")] ?? "",
        imageUrl: row[idx("imageurl")] ?? row[idx("imageUrl")] ?? "",
        assignedBranchId:
          row[idx("assignedbranchid")] ?? row[idx("assignedBranchId")] ?? "",
        minStockLevel: Number(
          row[idx("minstocklevel")] ?? row[idx("minStockLevel")] ?? 0
        ),
      };
      batch.set(ref, item);
    }
    await batch.commit();
    await logActivity({
      action: "inventory_import",
      collection: "inventory",
      summary: `Imported ${Math.max(
        rows.length - 1,
        0
      )} inventory rows from CSV`,
    });
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
      ipNumber: po.ipNumber ?? "",
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
          upc: "",
          itemName: "",
          modelNumber: "",
          amountOrdered: 0,
          category: "",
          orderCost: 0,
          amountReceived: 0,
          imageUrl: "",
          description: "",
          manufactureName: "",
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

    const {
      orderNumber,
      ipNumber,
      vendor,
      manufacture,
      receivingWarehouseId,
      items,
    } = poForm;

    if (!orderNumber || !vendor || !receivingWarehouseId) {
      messageBoxRef.current?.alert(
        "Fill in all required PO fields (PO Number, Vendor, Receiving Branch)."
      );
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
      ipNumber: ipNumber?.trim() || "",
      vendor,
      manufacture,
      receivingWarehouseId,
      items: items.map((it) => ({
        upc: it.upc ?? "",
        itemName: it.itemName,
        modelNumber: it.modelNumber,
        amountOrdered: Number(it.amountOrdered),
        category: it.category,
        orderCost: Number(it.orderCost),
        amountReceived: Number(it.amountReceived ?? 0),
        imageUrl: it.imageUrl ?? "",
        description: it.description ?? "",
        manufactureName: it.manufactureName ?? manufacture,
      })),
      status: "pending",
      orderDate: editingPO ? editingPO.orderDate : nowIso,
    };

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
      await logActivity({
        action: editingPO ? "purchase_order_update" : "purchase_order_create",
        collection: "purchaseOrders",
        docId: id,
        summary: `${editingPO ? "Updated" : "Created"} PO ${orderNumber}`,
      });
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
          inv.assignedBranchId === po.receivingWarehouseId &&
          (inv.manufacturePartNumber === item.modelNumber ||
            (!!item.upc && inv.upc === item.upc))
      );
      if (inventoryItem) {
        const invRef = doc(
          collection(db, `${basePath}/inventory`),
          inventoryItem.id
        );
        const invUpdate: Partial<InventoryItem> = {
          amountInInventory:
            Number(inventoryItem.amountInInventory) + remaining,
        };
        if (item.upc && !inventoryItem.upc) invUpdate.upc = item.upc;
        if (item.imageUrl && !inventoryItem.imageUrl)
          invUpdate.imageUrl = item.imageUrl;
        if (item.description && !inventoryItem.description)
          invUpdate.description = item.description;
        if (item.manufactureName && !inventoryItem.manufactureName)
          invUpdate.manufactureName = item.manufactureName;
        if (!inventoryItem.name && item.itemName)
          invUpdate.name = item.itemName;
        batch.update(invRef, invUpdate);
      } else {
        const id = crypto.randomUUID();
        const invRef = doc(collection(db, `${basePath}/inventory`), id);
        const template =
          inventoryItems.find(
            (inv) =>
              inv.manufacturePartNumber === item.modelNumber ||
              (!!item.upc && inv.upc === item.upc)
          ) ?? null;
        const newItem: InventoryItem = {
          id,
          upc: item.upc ?? template?.upc ?? "",
          modelNumber: item.modelNumber,
          name: item.itemName,
          category: item.category,
          amountInInventory: remaining,
          numOnOrder: 0,
          manufactureName: item.manufactureName ?? po.manufacture,
          manufacturePartNumber:
            template?.manufacturePartNumber ?? item.modelNumber,
          description: item.description ?? template?.description ?? "",
          imageUrl: item.imageUrl ?? template?.imageUrl ?? "",
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
    await logActivity({
      action: "purchase_order_receive_full",
      collection: "purchaseOrders",
      docId: po.id,
      summary: `Fully received PO ${po.orderNumber}`,
    });
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
            inv.assignedBranchId === po.receivingWarehouseId &&
            (inv.manufacturePartNumber === item.modelNumber ||
              (!!item.upc && inv.upc === item.upc))
        );
        if (inventoryItem) {
          const invRef = doc(
            collection(db, `${basePath}/inventory`),
            inventoryItem.id
          );
          const invUpdate: Partial<InventoryItem> = {
            amountInInventory:
              Number(inventoryItem.amountInInventory) + applyQty,
          };
          if (item.upc && !inventoryItem.upc) invUpdate.upc = item.upc;
          if (item.imageUrl && !inventoryItem.imageUrl)
            invUpdate.imageUrl = item.imageUrl;
          if (item.description && !inventoryItem.description)
            invUpdate.description = item.description;
          if (item.manufactureName && !inventoryItem.manufactureName)
            invUpdate.manufactureName = item.manufactureName;
          if (!inventoryItem.name && item.itemName)
            invUpdate.name = item.itemName;
          batch.update(invRef, invUpdate);
        } else {
          const id = crypto.randomUUID();
          const invRef = doc(collection(db, `${basePath}/inventory`), id);
          const template =
            inventoryItems.find(
              (inv) =>
                inv.manufacturePartNumber === item.modelNumber ||
                (!!item.upc && inv.upc === item.upc)
            ) ?? null;
          const newItem: InventoryItem = {
            id,
            upc: item.upc ?? template?.upc ?? "",
            modelNumber: item.modelNumber,
            name: item.itemName,
            category: item.category,
            amountInInventory: applyQty,
            numOnOrder: 0,
            manufactureName: item.manufactureName ?? po.manufacture,
            manufacturePartNumber:
              template?.manufacturePartNumber ?? item.modelNumber,
            description: item.description ?? template?.description ?? "",
            imageUrl: item.imageUrl ?? template?.imageUrl ?? "",
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
    await logActivity({
      action: "purchase_order_receive_partial",
      collection: "purchaseOrders",
      docId: po.id,
      summary: `Partially received PO ${po.orderNumber}`,
    });
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
    await logActivity({
      action: "purchase_order_cancel",
      collection: "purchaseOrders",
      docId: po.id,
      summary: `Cancelled PO ${po.orderNumber}`,
    });
  };

  const [transferForm, setTransferForm] = useState<{
    label?: string;
    trackingNumber?: string;
    sourceBranchId: string;
    destinationBranchId: string;
    lines: { itemId: string; quantity: number }[];
  }>({
    label: "",
    trackingNumber: "",
    sourceBranchId: "",
    destinationBranchId: "",
    lines: [],
  });

  const resetTransferForm = () => {
    setTransferForm({
      label: "",
      trackingNumber: "",
      sourceBranchId: "",
      destinationBranchId: "",
      lines: [],
    });
  };

  const addTransferLine = () => {
    setTransferForm((prev) => ({
      ...prev,
      lines: [...prev.lines, { itemId: "", quantity: 0 }],
    }));
  };

  const updateTransferLine = (
    index: number,
    field: "itemId" | "quantity",
    value: any
  ) => {
    setTransferForm((prev) => {
      const lines = [...prev.lines];
      const line = { ...lines[index] };
      if (field === "quantity") {
        line.quantity = Number(value);
      } else {
        line.itemId = value;
      }
      lines[index] = line;
      return { ...prev, lines };
    });
  };

  const removeTransferLine = (index: number) => {
    setTransferForm((prev) => {
      const lines = [...prev.lines];
      lines.splice(index, 1);
      return { ...prev, lines };
    });
  };

  const handleBuildTransferFromSelected = () => {
    if (selectedInventoryIds.length === 0) {
      messageBoxRef.current?.alert(
        "Select at least one inventory item to build a transfer."
      );
      return;
    }

    const selectedItems = filteredInventory.filter((it) =>
      selectedInventoryIds.includes(it.id)
    );

    if (selectedItems.length === 0) {
      messageBoxRef.current?.alert("Selected items not found in inventory.");
      return;
    }

    const sourceBranchId = selectedItems[0].assignedBranchId;
    const sameSource = selectedItems.every(
      (it) => it.assignedBranchId === sourceBranchId
    );

    if (!sameSource) {
      messageBoxRef.current?.alert(
        "All selected items must use the same source branch to build a transfer."
      );
      return;
    }

    setTransferForm({
      label: "",
      trackingNumber: "",
      sourceBranchId,
      destinationBranchId: "",
      lines: selectedItems.map((it) => ({
        itemId: it.id,
        quantity: 1,
      })),
    });

    setPage("transfers");
    setTransferModalOpen(true);
  };

  const handleEmailQuoteRequest = () => {
    if (selectedInventoryIds.length === 0) {
      messageBoxRef.current?.alert(
        "Select at least one inventory item to build an email quote."
      );
      return;
    }

    const selectedItems = filteredInventory.filter((it) =>
      selectedInventoryIds.includes(it.id)
    );

    if (selectedItems.length === 0) {
      messageBoxRef.current?.alert("Selected items not found in inventory.");
      return;
    }

    const lines = selectedItems.map((item, idx) => {
      const partNumber =
        item.manufacturePartNumber || item.modelNumber || "N/A";
      const name = item.name || item.modelNumber || "Unnamed Item";
      return `(ADD ORD QTY) - ${name} - ${partNumber}`;
    });

    const subject = encodeURIComponent("Quote Request");
    const body = encodeURIComponent(lines.join("\n\n"));
    const mailto = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailto, "_blank", "noopener,noreferrer");
  };

  const openTransferTrackingEditor = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setTransferTrackingValue(transfer.trackingNumber ?? "");
    setTransferTrackingModalOpen(true);
  };

  const handleSaveTransferTracking = async () => {
    if (!db || !basePath || !editingTransfer) return;
    const trackingNumber = transferTrackingValue.trim();
    const transferRef = doc(
      collection(db, `${basePath}/moves`),
      editingTransfer.id
    );
    await updateDoc(transferRef, { trackingNumber });
    await logActivity({
      action: "transfer_tracking_update",
      collection: "moves",
      docId: editingTransfer.id,
      summary: trackingNumber
        ? `Updated tracking for transfer ${editingTransfer.transferId} (${trackingNumber}).`
        : `Cleared tracking for transfer ${editingTransfer.transferId}.`,
    });
    setTransferTrackingModalOpen(false);
    setEditingTransfer(null);
    setTransferTrackingValue("");
  };

  const openPackingListPrintView = useCallback(
    (transfer: Transfer) => {
      // Brand colors from BlueLinx Brand Standards (Colors section)
      const primary = "#152435"; // Key / Primary
      const secondary = "#1E9CD8"; // Vibrant Blue / Secondary
      const gold = "#FFC400"; // Gold / Tertiary
      const lightBlue = "#F6FAFF"; // Light Blue

      const fromWh = warehouses.find((w) => w.id === transfer.sourceBranchId);
      const toWh = warehouses.find(
        (w) => w.id === transfer.destinationBranchId
      );

      const fromLabel = fromWh
        ? `${fromWh.shortCode || ""} ${fromWh.name || ""}`.trim()
        : transfer.sourceBranchId;
      const toLabel = toWh
        ? `${toWh.shortCode || ""} ${toWh.name || ""}`.trim()
        : transfer.destinationBranchId;

      const title = `Packing List - ${transfer.transferId}`;
      const win = window.open("", "_blank", "noopener,noreferrer");
      if (!win) {
        messageBoxRef.current?.alert(
          "Pop-up blocked. Allow pop-ups for this site to generate the packing list."
        );
        return;
      }

      const safe = (v: any) =>
        String(v ?? "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;");

      const rowsHtml = (transfer.lines ?? [])
        .map(
          (l, idx) => `
            <tr>
              <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb;">${
                idx + 1
              }</td>
              <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb;">${safe(
                l.itemModelNumber
              )}</td>
              <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb;">${safe(
                l.itemName
              )}</td>
              <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:right; font-variant-numeric: tabular-nums;">${safe(
                l.quantity
              )}</td>
            </tr>
          `
        )
        .join("");

      const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safe(title)}</title>
    <style>
      @page { margin: 16mm; }
      body { font-family: "Proxima Nova", Helvetica, Arial, sans-serif; color: ${primary}; }
      .brand-bar { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; background:${primary}; color:#fff; }
      .logo { font-weight:800; letter-spacing:0.5px; font-style:italic; font-size:20px; }
      .logo .x { color:${secondary}; }
      .tag { font-size:11px; opacity:0.95; }
      .wrap { padding:16px; }
      h1 { margin: 14px 0 6px; font-size: 18px; }
      .meta { display:grid; grid-template-columns: 1fr 1fr; gap:10px 20px; margin: 10px 0 16px; font-size: 12px; }
      .meta .k { color: #334155; font-weight: 600; }
      .meta .v { color: #0f172a; }
      .badge { display:inline-block; padding:3px 8px; border-radius:999px; background:${gold}; color:${primary}; font-weight:700; font-size:11px; }
      table { width:100%; border-collapse: collapse; font-size: 12px; }
      thead th { text-align:left; padding:10px 12px; background:${lightBlue}; border-bottom:2px solid ${secondary}; color:${primary}; }
      .right { text-align:right; }
      .foot { margin-top: 14px; font-size: 11px; color:#475569; display:flex; justify-content:space-between; }
      .print-hint { margin: 10px 0 0; font-size: 11px; color:#475569; }
      .no-print { margin-top: 12px; }
      .btn { display:inline-block; background:${secondary}; color:#fff; border:0; padding:10px 12px; border-radius:8px; font-size:12px; cursor:pointer; }
      .btn.secondary { background:#fff; color:${primary}; border:1px solid #cbd5e1; }
      @media print {
        .no-print { display:none !important; }
      }
    </style>
  </head>
  <body>
    <div class="brand-bar">
      <div>
        <div class="logo">BLUE<span class="x">LINX</span></div>
        <div class="tag">DELIVERING WHAT MATTERS</div>
      </div>
      <div class="badge">Packing List</div>
    </div>

    <div class="wrap">
      <h1>${safe(title)}</h1>
      <div class="meta">
        <div><div class="k">Transfer ID</div><div class="v">${safe(
          transfer.transferId
        )}</div></div>
        <div><div class="k">Created</div><div class="v">${safe(
          new Date(transfer.dateInitiated).toLocaleString()
        )}</div></div>
        <div><div class="k">From Branch</div><div class="v">${safe(
          fromLabel
        )}</div></div>
        <div><div class="k">To Branch</div><div class="v">${safe(
          toLabel
        )}</div></div>
        <div><div class="k">Label</div><div class="v">${safe(
          transfer.label || ""
        )}</div></div>
        <div><div class="k">Tracking</div><div class="v">${safe(
          transfer.trackingNumber || ""
        )}</div></div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:44px;">#</th>
            <th style="width:180px;">Model</th>
            <th>Item</th>
            <th class="right" style="width:90px;">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${
            rowsHtml ||
            '<tr><td colspan="4" style="padding:12px; color:#475569;">No line items.</td></tr>'
          }
        </tbody>
      </table>

      <div class="foot">
        <div>BlueLinx</div>
        <div>${safe(new Date().toLocaleDateString())}</div>
      </div>

      <div class="no-print">
        <div class="print-hint">Use Print. Then select Save as PDF.</div>
        <div style="display:flex; gap:10px;">
          <button class="btn" onclick="window.print()">Print</button>
          <button class="btn secondary" onclick="window.close()">Close</button>
        </div>
      </div>
    </div>

    <script>
      setTimeout(() => { try { window.focus(); window.print(); } catch (e) {} }, 250);
    </script>
  </body>
</html>`;

      win.document.open();
      win.document.write(html);
      win.document.close();
    },
    [warehouses]
  );

  const handleSaveTransfer = async () => {
    if (!db || !basePath) return;
    const {
      label,
      trackingNumber,
      sourceBranchId,
      destinationBranchId,
      lines,
    } = transferForm;

    if (
      !sourceBranchId ||
      !destinationBranchId ||
      !lines ||
      lines.length === 0
    ) {
      messageBoxRef.current?.alert(
        "Fill in required transfer fields (Source, Destination, at least one line item)."
      );
      return;
    }

    if (sourceBranchId === destinationBranchId) {
      messageBoxRef.current?.alert(
        "Source and destination branches must be different."
      );
      return;
    }

    for (const line of lines) {
      if (!line.itemId || !line.quantity || line.quantity <= 0) {
        messageBoxRef.current?.alert(
          "Each transfer line must have an item and a quantity greater than zero."
        );
        return;
      }

      const item = inventoryItems.find((inv) => inv.id === line.itemId);
      if (!item) {
        messageBoxRef.current?.alert("Transfer item not found in inventory.");
        return;
      }
      if (item.assignedBranchId !== sourceBranchId) {
        messageBoxRef.current?.alert(
          `Item ${item.modelNumber} is not in the selected source branch.`
        );
        return;
      }
    }

    const id = crypto.randomUUID();
    const transferRef = doc(collection(db, `${basePath}/moves`), id);

    const transferLines: TransferLine[] = transferForm.lines.map((line) => {
      const item = inventoryItems.find((inv) => inv.id === line.itemId)!;
      return {
        itemId: item.id,
        itemModelNumber: item.modelNumber,
        itemName: item.name,
        quantity: line.quantity,
      };
    });

    const nowIso = new Date().toISOString();
    const transfer: Transfer = {
      id,
      transferId: id,
      label: label?.trim() || "",
      trackingNumber: trackingNumber?.trim() || "",
      sourceBranchId,
      destinationBranchId,
      dateInitiated: nowIso,
      statusUpdatedAt: nowIso,
      status: "pending",
      lines: transferLines,
    };

    await setDoc(transferRef, transfer);

    const wantsPackingList =
      (await messageBoxRef.current?.confirm(
        "Transfer created. Create a packing list?"
      )) ?? false;

    if (wantsPackingList) {
      openPackingListPrintView(transfer);
    }

    // Return user to Transfers screen
    setTransferModalOpen(false);
    resetTransferForm();
    setSelectedInventoryIds([]);
    setPage("transfers");

    await logActivity({
      action: "transfer_create",
      collection: "moves",
      docId: id,
      summary: `Created transfer ${id} from ${sourceBranchId} to ${destinationBranchId}${
        label ? ` (${label})` : ""
      }${trackingNumber ? ` (Tracking: ${trackingNumber})` : ""}`,
    });
  };

  const handleUpdateTransferStatus = async (
    transfer: Transfer,
    newStatus: TransferStatus
  ) => {
    if (!db || !basePath) return;
    if (transfer.status === "completed") {
      return;
    }

    if (newStatus === "in-transit" && transfer.status !== "pending") {
      return;
    }

    if (newStatus === "cancelled") {
      const confirmed = await messageBoxRef.current?.confirm(
        `Cancel transfer ${transfer.transferId}?`
      );
      if (!confirmed) return;
      const transferRef = doc(collection(db, `${basePath}/moves`), transfer.id);
      await updateDoc(transferRef, {
        status: "cancelled",
        statusUpdatedAt: new Date().toISOString(),
      });
      await logActivity({
        action: "transfer_cancel",
        collection: "moves",
        docId: transfer.id,
        summary: `Cancelled transfer ${transfer.transferId}`,
      });
      return;
    }

    if (newStatus === "completed") {
      const confirmed = await messageBoxRef.current?.confirm(
        `Mark transfer ${transfer.transferId} as completed and move inventory?`
      );
      if (!confirmed) return;

      const nowIso = new Date().toISOString();
      const batch = writeBatch(db);
      const lines = transfer.lines ?? [];

      for (const line of lines) {
        const sourceItem =
          inventoryItems.find((inv) => inv.id === line.itemId) ?? null;
        if (!sourceItem) {
          messageBoxRef.current?.alert(
            `Source item for ${line.itemModelNumber} is no longer available.`
          );
          return;
        }
        if (sourceItem.assignedBranchId !== transfer.sourceBranchId) {
          messageBoxRef.current?.alert(
            `Item ${sourceItem.modelNumber} is no longer in the source branch.`
          );
          return;
        }
        if (sourceItem.amountInInventory < line.quantity) {
          messageBoxRef.current?.alert(
            `Insufficient stock to complete transfer item ${sourceItem.modelNumber}.`
          );
          return;
        }

        const sourceRef = doc(
          collection(db, `${basePath}/inventory`),
          sourceItem.id
        );
        batch.update(sourceRef, {
          amountInInventory: sourceItem.amountInInventory - line.quantity,
        });

        const destItem =
          inventoryItems.find(
            (inv) =>
              inv.modelNumber === line.itemModelNumber &&
              inv.assignedBranchId === transfer.destinationBranchId
          ) ?? null;

        if (destItem) {
          const destRef = doc(
            collection(db, `${basePath}/inventory`),
            destItem.id
          );
          batch.update(destRef, {
            amountInInventory: destItem.amountInInventory + line.quantity,
          });
        } else {
          const id = crypto.randomUUID();
          const destRef = doc(collection(db, `${basePath}/inventory`), id);
          const newItem: InventoryItem = {
            id,
            upc: sourceItem.upc ?? "",
            modelNumber: sourceItem.modelNumber,
            name: sourceItem.name,
            category: sourceItem.category,
            amountInInventory: line.quantity,
            numOnOrder: 0,
            manufactureName: sourceItem.manufactureName,
            manufacturePartNumber: sourceItem.manufacturePartNumber,
            imageUrl: sourceItem.imageUrl,
            assignedBranchId: transfer.destinationBranchId,
            minStockLevel: sourceItem.minStockLevel,
          };
          batch.set(destRef, newItem);
        }
      }

      const transferRef = doc(collection(db, `${basePath}/moves`), transfer.id);
      batch.update(transferRef, {
        status: "completed",
        dateCompleted: nowIso,
        statusUpdatedAt: nowIso,
      });
      await batch.commit();
      await logActivity({
        action: "transfer_complete",
        collection: "moves",
        docId: transfer.id,
        summary: `Completed transfer ${transfer.transferId}`,
      });
    } else {
      const transferRef = doc(collection(db, `${basePath}/moves`), transfer.id);
      await updateDoc(transferRef, {
        status: newStatus,
        statusUpdatedAt: new Date().toISOString(),
      });
      await logActivity({
        action: "transfer_status_update",
        collection: "moves",
        docId: transfer.id,
        summary: `Updated transfer ${transfer.transferId} status to ${newStatus}`,
      });
    }
  };

  const handleDeleteWarehouse = async (warehouse: Warehouse) => {
    if (!db || !basePath) return;
    const confirmed = await messageBoxRef.current?.confirm(
      `Delete branch ${warehouse.name}?`
    );
    if (!confirmed) return;
    const ref = doc(collection(db, `${basePath}/warehouses`), warehouse.id);
    await deleteDoc(ref);
    await logActivity({
      action: "warehouse_delete",
      collection: "warehouses",
      docId: warehouse.id,
      summary: `Deleted warehouse ${warehouse.name}`,
    });
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
        shortCode: row[idx("shortcode")] ?? row[idx("shortCode")] ?? "",
        name,
        streetAddress:
          row[idx("streetaddress")] ?? row[idx("streetAddress")] ?? "",
        city: row[idx("city")] ?? "",
        state: row[idx("state")] ?? "",
      };
      batch.set(ref, warehouse);
    }
    await batch.commit();
    await logActivity({
      action: "warehouse_import",
      collection: "warehouses",
      summary: `Imported ${Math.max(rows.length - 1, 0)} warehouses from CSV`,
    });
    messageBoxRef.current?.alert("Branch CSV import complete.");
  };

  const renderInventoryPage = () => {
    return (
      <div className="space-y-4">
        <DataTable<InventoryItem>
          title="Inventory"
          data={filteredInventory}
          searchFields={[
            "modelNumber",
            "name",
            "category",
            "manufactureName",
            "upc",
          ]}
          filterFields={[
            {
              key: "assignedBranchId",
              label: "Branch",
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
              key: "select",
              label: "",
              render: (row) => (
                <input
                  type="checkbox"
                  checked={selectedInventoryIds.includes(row.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    setSelectedInventoryIds((prev) =>
                      e.target.checked
                        ? [...prev, row.id]
                        : prev.filter((id) => id !== row.id)
                    );
                  }}
                />
              ),
            },
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
                      onClick={(e) => e.stopPropagation()}
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
              label: "Branch",
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
              className="px-2 py-1 rounded-md bg-[#005691] text-xs text-white hover:bg-[#00426e] hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                openInventoryModalForEdit(row);
              }}
            >
              Edit
            </button>
          )}
          expandable
          renderExpandedRow={(row) => (
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-40 flex-shrink-0">
                {row.imageUrl ? (
                  <img
                    src={row.imageUrl}
                    alt={row.name || row.modelNumber}
                    className="w-full h-40 object-cover rounded-md border border-slate-200"
                  />
                ) : (
                  <div className="w-full h-40 rounded-md bg-slate-200 flex items-center justify-center text-sm font-semibold text-slate-600">
                    No Image
                  </div>
                )}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-800 mb-1">Name</div>
                  <div className="text-slate-700">{row.name}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 mb-1">
                    Manufacture
                  </div>
                  <div className="text-slate-700">{row.manufactureName}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 mb-1">
                    Manufacture Part Number
                  </div>
                  <div className="text-slate-700">
                    {row.manufacturePartNumber || "N/A"}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 mb-1">
                    Model Number
                  </div>
                  <div className="text-slate-700">{row.modelNumber}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-800 mb-1">UPC</div>
                  <div className="text-slate-700">{row.upc || "N/A"}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="font-semibold text-slate-800 mb-1">
                    Description
                  </div>
                  <div className="text-slate-700">
                    {row.description || "N/A"}
                  </div>
                </div>
              </div>
            </div>
          )}
        >
          <div className="flex flex-wrap gap-2">
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
            <button
              className="px-3 py-2 rounded-md bg-emerald-600 text-white text-xs sm:text-sm hover:bg-emerald-700"
              onClick={(e) => {
                e.stopPropagation();
                handleBuildTransferFromSelected();
              }}
            >
              Build Transfer
            </button>
            <button
              className="px-3 py-2 rounded-md bg-indigo-600 text-white text-xs sm:text-sm hover:bg-indigo-700"
              onClick={(e) => {
                e.stopPropagation();
                handleEmailQuoteRequest();
              }}
            >
              Request Quote
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
                Quick Add Branch
              </button>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded-md bg-[#FF6347] text-sm text-white hover:bg-[#e4573d]"
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
                Manufacture Part Number <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={inventoryForm.manufacturePartNumber ?? ""}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    manufacturePartNumber: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                  value={inventoryForm.category ?? ""}
                  onChange={(e) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  onFocus={() => setCategoryDropdownOpen(true)}
                  onBlur={() =>
                    setTimeout(() => setCategoryDropdownOpen(false), 100)
                  }
                  placeholder="Select or type a category"
                />
                {categoryDropdownOpen && filteredCategoryOptions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full max-h-32 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-sm">
                    {filteredCategoryOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setInventoryForm((prev) => ({
                            ...prev,
                            category: opt.value,
                          }));
                          setCategoryDropdownOpen(false);
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Pick an existing category or enter a new one.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Tags
              </label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                placeholder="Comma separated"
                value={
                  Array.isArray(inventoryForm.tags)
                    ? inventoryForm.tags.join(", ")
                    : inventoryForm.tags ?? ""
                }
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    tags: e.target.value
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Name <span className="text-red-500">*</span>
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
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Description
              </label>
              <textarea
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                rows={3}
                value={inventoryForm.description ?? ""}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Manufacture <span className="text-red-500">*</span>
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
                Manufacture Part Number <span className="text-red-500">*</span>
              </label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={inventoryForm.manufacturePartNumber ?? ""}
                onChange={(e) =>
                  setInventoryForm((prev) => ({
                    ...prev,
                    manufacturePartNumber: e.target.value,
                  }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Branch <span className="text-red-500">*</span>
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
                <option value="">Select Branch</option>
                {sortedWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.shortCode || w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Amount In Inventory <span className="text-red-500">*</span>
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
                Min Stock Level <span className="text-red-500">*</span>
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
              <div className="flex gap-2">
                <input
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                  value={inventoryForm.imageUrl ?? ""}
                  onChange={(e) =>
                    setInventoryForm((prev) => ({
                      ...prev,
                      imageUrl: e.target.value,
                    }))
                  }
                  placeholder="Paste image URL or upload below"
                />
                <button
                  type="button"
                  className="px-3 py-2 rounded-md border border-slate-300 text-xs text-slate-700 hover:bg-slate-50"
                  onClick={() => inventoryImageInputRef.current?.click()}
                >
                  Upload
                </button>
                <input
                  ref={inventoryImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const result = reader.result;
                      if (typeof result === "string") {
                        setInventoryForm((prev) => ({
                          ...prev,
                          imageUrl: result,
                        }));
                      }
                    };
                    reader.readAsDataURL(file);
                    // clear input so same file can be reselected
                    e.target.value = "";
                  }}
                />
              </div>
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
            amountInInventory, manufactureName, manufacturePartNumber, imageUrl,
            description, upc, assignedBranchId, minStockLevel.
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
          searchFields={["orderNumber", "ipNumber", "vendor", "manufacture"]}
          filterFields={[
            {
              key: "receivingWarehouseId",
              label: "Branch",
              type: "select",
              options: warehouseSelectOptions,
            },
            {
              key: "ipNumber",
              label: "IP Number",
              type: "select",
              options: poIpNumberOptions,
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
            { key: "ipNumber", label: "IP Number" },
            { key: "vendor", label: "Vendor" },
            { key: "manufacture", label: "Manufacture" },
            {
              key: "receivingWarehouseId",
              label: "Receiving Branch",
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
                className="px-2 py-1 rounded-md bg-[#005691] text-xs text-white hover:bg-[#00426e]"
                onClick={(e) => {
                  e.stopPropagation();
                  openPoModalForEdit(row);
                }}
              >
                Edit
              </button>
              <button
                className="px-2 py-1 rounded-md bg-emerald-100 text-xs text-emerald-800 hover:bg-emerald-200"
                onClick={(e) => {
                  e.stopPropagation();
                  setPoReceiveMode({ po: row, mode: "full" });
                }}
              >
                Receive
              </button>
              <button
                className="px-2 py-1 rounded-md bg-[#FF6347] text-xs text-white hover:bg-[#e4573d]"
                onClick={(e) => {
                  e.stopPropagation();
                  openPartialReceiveModal(row);
                }}
              >
                Partial
              </button>
              <button
                className="px-2 py-1 rounded-md bg-[#FF6347] text-xs text-white hover:bg-[#e4573d]"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelPo(row);
                }}
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
                Quick Add Branch
              </button>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded-md bg-[#FF6347] text-sm text-white hover:bg-[#e4573d]"
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
                PO Number <span className="text-red-500">*</span>
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
                IP Number
              </label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={poForm.ipNumber ?? ""}
                onChange={(e) =>
                  setPoForm((prev) => ({
                    ...prev,
                    ipNumber: e.target.value,
                  }))
                }
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Vendor <span className="text-red-500">*</span>
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
                Receiving Branch <span className="text-red-500">*</span>
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
                <option value="">Select Branch</option>
                {sortedWarehouses.map((w) => (
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
                    <th className="px-2 py-2 text-left">Manufacture Part #</th>
                    <th className="px-2 py-2 text-left">Category</th>
                    <th className="px-2 py-2 text-left">Description</th>
                    <th className="px-2 py-2 text-left">Image URL</th>
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
                      <td className="px-2 py-1">
                        <textarea
                          className="w-full border border-slate-200 rounded-md px-2 py-1"
                          rows={2}
                          value={item.description ?? ""}
                          onChange={(e) =>
                            handleUpdatePoLineItem(
                              idx,
                              "description",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-1">
                        <input
                          className="w-full border border-slate-200 rounded-md px-2 py-1"
                          value={item.imageUrl ?? ""}
                          onChange={(e) =>
                            handleUpdatePoLineItem(
                              idx,
                              "imageUrl",
                              e.target.value
                            )
                          }
                          placeholder="Optional image URL"
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
                        colSpan={8}
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
                className="px-4 py-2 rounded-md bg-[#FF6347] text-sm text-white hover:bg-[#e4573d]"
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
        data={filteredPoHistory}
        searchFields={["orderNumber", "ipNumber", "vendor", "manufacture"]}
        filterFields={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: poHistoryStatusOptions,
          },
          {
            key: "ipNumber",
            label: "IP Number",
            type: "select",
            options: poHistoryIpNumberOptions,
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
          { key: "ipNumber", label: "IP Number" },
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
          data={filteredTransfers}
          searchFields={[
            "transferId",
            "label",
            "trackingNumber",
            "sourceBranchId",
            "destinationBranchId",
            "status",
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
            { key: "label", label: "Order Label" },
            { key: "trackingNumber", label: "Tracking #" },
            {
              key: "itemModelNumber",
              label: "First Model #",
              render: (row) => row.lines?.[0]?.itemModelNumber ?? "",
            },
            {
              key: "itemName",
              label: "First Item Name",
              render: (row) => row.lines?.[0]?.itemName ?? "",
            },
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
              label: "Total Qty",
              render: (row) =>
                row.lines?.reduce((sum, line) => sum + line.quantity, 0) ?? 0,
            },
            {
              key: "status",
              label: "Status",
            },
          ]}
          actions={(row) => (
            <div className="flex gap-1 justify-end">
              <button
                className="btn-outline px-2 py-1 rounded-md border border-slate-300 text-xs hover:bg-slate-50"
                onClick={(e) => {
                  e.stopPropagation();
                  openTransferTrackingEditor(row);
                }}
              >
                Edit Tracking
              </button>
              <button
                className="btn-outline px-2 py-1 rounded-md border border-slate-300 text-xs hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!row.trackingNumber) {
                    messageBoxRef.current?.alert(
                      "No tracking number is set for this transfer."
                    );
                    return;
                  }
                  const url = `https://www.google.com/search?q=${encodeURIComponent(
                    row.trackingNumber
                  )}`;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                disabled={!row.trackingNumber}
              >
                Track
              </button>
              {row.status === "pending" && (
                <button
                  className="px-2 py-1 rounded-md bg-[#005691] text-xs text-white hover:bg-[#00426e]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateTransferStatus(row, "in-transit");
                  }}
                >
                  In-Transit
                </button>
              )}
              {(row.status === "pending" || row.status === "in-transit") && (
                <button
                  className="px-2 py-1 rounded-md bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateTransferStatus(row, "completed");
                  }}
                >
                  Completed
                </button>
              )}
              {(row.status === "pending" || row.status === "in-transit") && (
                <button
                  className="px-2 py-1 rounded-md bg-[#FF6347] text-xs text-white hover:bg-[#e4573d]"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateTransferStatus(row, "cancelled");
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}
          expandable
          renderExpandedRow={(row) => {
            const entries = activityHistory
              .filter(
                (entry) =>
                  entry.collection === "moves" && entry.docId === row.id
              )
              .sort((a, b) =>
                (b.timestamp || "").localeCompare(a.timestamp || "")
              );
            return (
              <div className="bg-slate-50 rounded-md p-3 max-h-48 overflow-y-auto space-y-2">
                {entries.length === 0 && (
                  <p className="text-xs text-slate-500">No activity yet.</p>
                )}
                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="text-xs text-slate-700 border-b border-slate-200 last:border-0 pb-2 last:pb-0"
                  >
                    <div className="font-semibold text-slate-800">
                      {entry.action}
                    </div>
                    <div className="text-slate-600">
                      {(entry.userName || getUserName()) ?? "Unknown"} ·{" "}
                      {entry.timestamp
                        ? new Date(entry.timestamp).toLocaleString()
                        : "—"}
                    </div>
                    {entry.summary && (
                      <div className="text-slate-600">{entry.summary}</div>
                    )}
                  </div>
                ))}
              </div>
            );
          }}
        >
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded-md bg-[#005691] text-white text-xs sm:text-sm hover:bg-[#00426e]"
              onClick={() => {
                resetTransferForm();
                setTransferModalOpen(true);
              }}
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
            <div className="flex justify-between gap-3">
              <button
                type="button"
                className="px-3 py-2 rounded-md border border-slate-300 text-xs sm:text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setWarehouseModalQuickOpen(true)}
              >
                Quick Add Branch
              </button>
              <div className="flex gap-3">
                <button
                  className="px-4 py-2 rounded-md bg-[#FF6347] text-sm text-white hover:bg-[#e4573d]"
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
            </div>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Order Label
              </label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={transferForm.label ?? ""}
                onChange={(e) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    label: e.target.value,
                  }))
                }
                placeholder="Optional name for this transfer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Source Branch <span className="text-red-500">*</span>
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
                {sortedWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.shortCode || w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Destination Branch <span className="text-red-500">*</span>
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
                {sortedWarehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.shortCode || w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Tracking Number
              </label>
              <input
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
                value={transferForm.trackingNumber ?? ""}
                onChange={(e) =>
                  setTransferForm((prev) => ({
                    ...prev,
                    trackingNumber: e.target.value,
                  }))
                }
                placeholder="Optional shipment tracking number"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-800">
                Transfer Lines
              </h3>
              <button
                type="button"
                className="px-2 py-1 rounded-md bg-slate-100 text-xs hover:bg-slate-200"
                onClick={addTransferLine}
              >
                Add Line
              </button>
            </div>
            <div className="border border-slate-200 rounded-md overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-2 text-left">
                      Item <span className="text-red-500">*</span>
                    </th>
                    <th className="px-2 py-2 text-right">
                      Quantity <span className="text-red-500">*</span>
                    </th>
                    <th className="px-2 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {transferForm.lines.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-2 py-3 text-center text-slate-500"
                      >
                        No transfer lines
                      </td>
                    </tr>
                  )}
                  {transferForm.lines.map((line, idx) => (
                    <tr key={idx} className="border-t border-slate-100">
                      <td className="px-2 py-1">
                        <select
                          className="w-full border border-slate-300 rounded-md px-2 py-1 text-xs"
                          value={line.itemId}
                          onChange={(e) =>
                            updateTransferLine(idx, "itemId", e.target.value)
                          }
                        >
                          <option value="">Select Item</option>
                          {inventoryItems.map((inv) => (
                            <option key={inv.id} value={inv.id}>
                              {inv.modelNumber} - {inv.name} (
                              {inv.amountInInventory} on hand)
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1 text-right">
                        <input
                          type="number"
                          className="w-24 border border-slate-300 rounded-md px-2 py-1 text-right"
                          value={line.quantity}
                          onChange={(e) =>
                            updateTransferLine(idx, "quantity", e.target.value)
                          }
                        />
                      </td>
                      <td className="px-2 py-1 text-right">
                        <button
                          type="button"
                          className="px-2 py-1 rounded-md bg-red-100 text-red-800 hover:bg-red-200"
                          onClick={() => removeTransferLine(idx)}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>

        <Modal
          open={transferTrackingModalOpen}
          onClose={() => {
            setTransferTrackingModalOpen(false);
            setEditingTransfer(null);
            setTransferTrackingValue("");
          }}
          title={
            editingTransfer
              ? `Edit Tracking - ${editingTransfer.transferId}`
              : "Edit Tracking"
          }
          maxWidthClass="max-w-lg"
          footer={
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-md bg-[#FF6347] text-sm text-white hover:bg-[#e4573d]"
                onClick={() => {
                  setTransferTrackingModalOpen(false);
                  setEditingTransfer(null);
                  setTransferTrackingValue("");
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-[#005691] text-sm text-white hover:bg-[#00426e]"
                onClick={handleSaveTransferTracking}
              >
                Save
              </button>
            </div>
          }
        >
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Tracking Number
            </label>
            <input
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005691]"
              value={transferTrackingValue}
              onChange={(e) => setTransferTrackingValue(e.target.value)}
              placeholder="Optional shipment tracking number"
            />
          </div>
        </Modal>
      </div>
    );
  };

  const activityHistorySorted = useMemo(
    () =>
      [...activityHistory].sort((a, b) =>
        (b.timestamp || "").localeCompare(a.timestamp || "")
      ),
    [activityHistory]
  );

  const renderActivityHistoryPage = () => {
    return (
      <div className="space-y-4">
        <DataTable<ActivityLog>
          title="Activity History"
          data={activityHistorySorted}
          searchFields={[
            "summary",
            "action",
            "userName",
            "collection",
            "docId",
          ]}
          filterFields={[
            {
              key: "action",
              label: "Action",
              type: "select",
              options: activityFilterOptions.actions,
            },
            {
              key: "userName",
              label: "User",
              type: "select",
              options: activityFilterOptions.users,
            },
          ]}
          columns={[
            {
              key: "timestamp",
              label: "Time",
              render: (row) =>
                row.timestamp ? new Date(row.timestamp).toLocaleString() : "—",
              sortFn: (a, b) =>
                (a.timestamp || "").localeCompare(b.timestamp || ""),
            },
            { key: "action", label: "Action" },
            { key: "userName", label: "User" },
            { key: "collection", label: "Collection" },
            { key: "docId", label: "Doc ID" },
            { key: "summary", label: "Summary" },
          ]}
          getRowId={(row) => row.id}
        />
      </div>
    );
  };

  const renderWarehousesPage = () => {
    return (
      <div className="space-y-4">
        <div className="text-sm text-slate-700">
          Default branch:{" "}
          {defaultWarehouseId
            ? warehouses.find((w) => w.id === defaultWarehouseId)?.name ||
              defaultWarehouseId
            : "None selected"}
        </div>
        <DataTable<Warehouse>
          title="Branches"
          data={sortedWarehouses}
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
            {
              key: "default",
              label: "Default",
              render: (row) =>
                row.id === defaultWarehouseId ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    Default
                  </span>
                ) : (
                  ""
                ),
            },
          ]}
          actions={(row) => (
            <div className="flex gap-1 justify-end">
              <button
                className="btn-outline px-2 py-1 rounded-md border border-slate-300 text-xs hover:bg-slate-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setDefaultWarehouseId(row.id);
                }}
                disabled={row.id === defaultWarehouseId}
              >
                {row.id === defaultWarehouseId ? "Default" : "Set Default"}
              </button>
              <button
                className="px-2 py-1 rounded-md bg-[#005691] text-xs text-white hover:bg-[#00426e]"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingWarehouse(row);
                  setWarehouseModalMainOpen(true);
                }}
              >
                Edit
              </button>
              <button
                className="px-2 py-1 rounded-md bg-[#FF6347] text-xs text-white hover:bg-[#e4573d]"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteWarehouse(row);
                }}
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
          onLogActivity={logActivity}
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

  if (!authInitDone || !firebaseApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <LoadingSpinner />
      </div>
    );
  }

  if (!authUser) {
    return <AuthPage onLoginSuccess={() => setAuthInitDone(true)} />;
  }

  if (!db || !basePath) {
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
                In Stock - IMS
              </h1>
              <p className="text-[11px] text-white/80">
                App ID: {appId} · User: {getUserName()}
              </p>
            </div>
          </div>
          <nav className="flex gap-1 sm:gap-2 items-center text-xs sm:text-sm">
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
            <button
              type="button"
              className="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium text-white/80 hover:bg-white/10"
              onClick={() => setIsDark((prev) => !prev)}
              aria-pressed={isDark}
              aria-label="Toggle dark mode"
            >
              <span aria-hidden>{isDark ? "☀️" : "🌙"}</span>
              <span className="sr-only">Toggle theme</span>
            </button>
            <button
              className="px-3 py-1 rounded-full text-xs sm:text-sm font-medium text-white/80 hover:bg-white/10"
              onClick={handleSignOut}
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 space-y-4">
        {(loadingInventory ||
          loadingWarehouses ||
          loadingPOs ||
          loadingPoHistory ||
          loadingTransfers ||
          loadingActivity) && <LoadingSpinner />}
        {page === "inventory" && renderInventoryPage()}
        {page === "pos" && renderPendingPoPage()}
        {page === "poHistory" && renderPoHistoryPage()}
        {page === "transfers" && renderTransfersPage()}
        {page === "warehouses" && renderWarehousesPage()}
        {page === "activityHistory" && renderActivityHistoryPage()}
      </main>

      <AddWarehouseModal
        open={warehouseModalQuickOpen}
        onClose={() => setWarehouseModalQuickOpen(false)}
        onSaved={() => {}}
        db={db!}
        basePath={basePath!}
        onLogActivity={logActivity}
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
