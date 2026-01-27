export type TransferStatus = "pending" | "in-transit" | "completed" | "cancelled";

export interface Warehouse {
  id: string;
  shortCode: string;
  name: string;
  streetAddress: string;
  city: string;
  state: string;
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
