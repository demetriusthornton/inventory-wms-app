import type { InventoryItem, StockStatus } from "../types";

export function getStockStatus(item: InventoryItem): StockStatus {
  if (item.amountInInventory < 0) return "negative";
  if (item.amountInInventory < item.minStockLevel) return "low";
  return "healthy";
}
