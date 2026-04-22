export type TransferStatus = "pending" | "in-transit" | "completed" | "cancelled";

export interface Warehouse {
  id: string;
  shortCode: string;
  name: string;
  streetAddress: string;
  city: string;
  state: string;
  type?: "standard" | "project";
  projectId?: string;
}

export type ProjectStatus = "active" | "pending" | "on-hold" | "closed";

export interface Project {
  id: string;
  ipNumber: string;
  projectNumber?: string;
  projectName: string;
  description?: string;
  status: ProjectStatus;
  parentBranchId: string;
  createdAt: string;
  createdBy: string;
  closedDate?: string;
}

export interface ProjectInventoryItem {
  id: string;
  projectId: string;
  sourceItemId?: string;
  sourcePurchaseOrderId?: string;
  modelNumber: string;
  name: string;
  category: string;
  manufactureName: string;
  manufacturePartNumber: string;
  imageUrl: string;
  upc?: string;
  description?: string;
  quantity: number;
  allocatedAt: string;
  createdBy: string;
}

export interface ProjectShipmentLine {
  projectItemId: string;
  name: string;
  modelNumber: string;
  quantity: number;
}

export interface ProjectShipment {
  id: string;
  projectId: string;
  destinationBranchId: string;
  label?: string;
  trackingNumber?: string;
  status: "pending" | "shipped";
  lines: ProjectShipmentLine[];
  createdAt: string;
  createdBy: string;
  shippedAt?: string;
}

export interface InventoryItem {
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

export interface PurchaseOrderItem {
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

export interface PurchaseOrder {
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
  projectId?: string;
}

export interface PoFormState {
  orderNumber: string;
  ipNumber?: string;
  vendor: string;
  manufacture: string;
  receivingWarehouseId: string;
  items: PurchaseOrderItem[];
}

export interface TransferLine {
  itemId: string;
  itemModelNumber: string;
  itemName: string;
  quantity: number;
}

export interface Transfer {
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

export interface ActivityLog {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  collection: string;
  docId?: string;
  summary: string;
}
