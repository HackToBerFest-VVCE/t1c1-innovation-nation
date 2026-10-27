/**
 * Pure utility functions for EcoRetail inventory calculations, sorting, and validation.
 */

export interface InventoryItemData {
  id?: string;
  userId: string;
  itemName: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
  category?: string;
  date?: string; // Standard YYYY-MM-DD date format
  sourceInvoice?: string;
  createdAt?: string | { seconds: number; nanoseconds: number } | Date;
  updatedAt?: string | { seconds: number; nanoseconds: number } | Date;
}

export interface InventoryTotals {
  totalUnits: number;
  totalValue: number;
  uniqueProductsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface CategorySummary {
  category: string;
  totalValue: number;
  totalUnits: number;
  itemCount: number;
  percentage: number;
}

export interface TimelineDataPoint {
  date: string;
  displayDate: string;
  totalValue: number;
  totalUnits: number;
  itemCount: number;
}

/**
 * Format currency in Indian Rupees (INR) using Indian numbering system.
 * e.g., ₹1,25,000.50
 */
export function formatINR(amount: number): string {
  const num = Number(amount) || 0;
  return '₹' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format date string into human readable format, e.g. "26 Oct 2026".
 */
export function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    // If it's YYYY-MM-DD, parse parts safely to avoid timezone offset shifts
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Returns today's date formatted as YYYY-MM-DD.
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Automatically sorts extracted or retrieved items alphabetically by Item Name.
 */
export function sortItemsAlphabetically<T extends { itemName: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => 
    a.itemName.trim().localeCompare(b.itemName.trim(), undefined, { sensitivity: 'base' })
  );
}

/**
 * Computes dashboard aggregate metrics.
 */
export function calculateInventoryTotals(items: InventoryItemData[]): InventoryTotals {
  let totalUnits = 0;
  let totalValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;

  for (const item of items) {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const value = Math.max(0, Number(item.totalValue) || (qty * (Number(item.pricePerUnit) || 0)));

    totalUnits += qty;
    totalValue += value;

    if (qty === 0) {
      outOfStockCount++;
      lowStockCount++; // 0 is also low stock (< 5)
    } else if (qty < 5) {
      lowStockCount++;
    }
  }

  return {
    totalUnits,
    totalValue: Math.round(totalValue * 100) / 100,
    uniqueProductsCount: items.length,
    lowStockCount,
    outOfStockCount,
  };
}

/**
 * Checks whether an item's stock drops below 5 units.
 */
export function isLowStock(quantity: number): boolean {
  return quantity < 5;
}

/**
 * Subtracts sold quantity safely, ensuring stock never drops below 0.
 */
export function depleteItemQuantity(currentQty: number, soldQty: number): number {
  if (soldQty <= 0) return currentQty;
  return Math.max(0, currentQty - soldQty);
}

/**
 * Sanitizes and validates an item extracted from AI or entered by user.
 */
export function sanitizeInventoryItem(raw: Partial<InventoryItemData>, userId: string): Omit<InventoryItemData, 'createdAt' | 'updatedAt'> {
  const cleanName = (raw.itemName || 'Unnamed Item').trim().slice(0, 150);
  const qty = Math.max(0, Math.floor(Number(raw.quantity) || 0));
  const price = Math.max(0, Math.round((Number(raw.pricePerUnit) || 0) * 100) / 100);
  const total = Math.max(0, Math.round((raw.totalValue !== undefined ? Number(raw.totalValue) : qty * price) * 100) / 100);
  const cat = raw.category ? raw.category.trim().slice(0, 60) : 'General';
  const invoice = raw.sourceInvoice ? raw.sourceInvoice.trim().slice(0, 120) : undefined;
  
  // Clean date or default to today
  let date = getTodayDateString();
  if (raw.date && typeof raw.date === 'string') {
    const trimmed = raw.date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      date = trimmed;
    } else {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        date = parsed.toISOString().split('T')[0];
      }
    }
  }

  const result: Omit<InventoryItemData, 'createdAt' | 'updatedAt'> = {
    userId,
    itemName: cleanName || 'Unnamed Item',
    quantity: qty,
    pricePerUnit: price,
    totalValue: total,
    category: cat,
    date,
  };

  if (invoice) {
    result.sourceInvoice = invoice;
  }

  return result;
}

/**
 * Filter items by search text and filter criteria.
 */
export function filterInventory(
  items: InventoryItemData[],
  searchQuery: string,
  filterType: 'all' | 'low-stock' | 'out-of-stock' | string
): InventoryItemData[] {
  const query = searchQuery.trim().toLowerCase();

  return items.filter((item) => {
    // Search match
    const matchesSearch = !query || 
      item.itemName.toLowerCase().includes(query) ||
      (item.category && item.category.toLowerCase().includes(query)) ||
      (item.date && item.date.toLowerCase().includes(query));

    if (!matchesSearch) return false;

    // Filter type match
    if (filterType === 'all') return true;
    if (filterType === 'low-stock') return item.quantity > 0 && item.quantity < 5;
    if (filterType === 'out-of-stock') return item.quantity === 0;
    if (filterType.startsWith('cat:')) {
      const targetCat = filterType.replace('cat:', '').toLowerCase();
      return (item.category || '').toLowerCase() === targetCat;
    }

    return true;
  });
}

/**
 * Computes category breakdown for data visualization charts.
 */
export function getCategoryBreakdown(items: InventoryItemData[]): CategorySummary[] {
  const map = new Map<string, { totalValue: number; totalUnits: number; itemCount: number }>();
  let grandTotalValue = 0;

  for (const item of items) {
    const cat = item.category || 'General';
    const val = item.totalValue || (item.quantity * item.pricePerUnit);
    const units = item.quantity;
    grandTotalValue += val;

    const existing = map.get(cat) || { totalValue: 0, totalUnits: 0, itemCount: 0 };
    existing.totalValue += val;
    existing.totalUnits += units;
    existing.itemCount += 1;
    map.set(cat, existing);
  }

  const result: CategorySummary[] = [];
  map.forEach((data, category) => {
    result.push({
      category,
      totalValue: Math.round(data.totalValue * 100) / 100,
      totalUnits: data.totalUnits,
      itemCount: data.itemCount,
      percentage: grandTotalValue > 0 ? Math.round((data.totalValue / grandTotalValue) * 1000) / 10 : 0,
    });
  });

  // Sort descending by total value
  return result.sort((a, b) => b.totalValue - a.totalValue);
}

/**
 * Computes date-based restocking timeline for data visualization charts.
 */
export function getTimelineBreakdown(items: InventoryItemData[]): TimelineDataPoint[] {
  const map = new Map<string, { totalValue: number; totalUnits: number; itemCount: number }>();

  for (const item of items) {
    const d = item.date || getTodayDateString();
    const val = item.totalValue || (item.quantity * item.pricePerUnit);
    const units = item.quantity;

    const existing = map.get(d) || { totalValue: 0, totalUnits: 0, itemCount: 0 };
    existing.totalValue += val;
    existing.totalUnits += units;
    existing.itemCount += 1;
    map.set(d, existing);
  }

  const points: TimelineDataPoint[] = [];
  map.forEach((data, date) => {
    points.push({
      date,
      displayDate: formatDateDisplay(date),
      totalValue: Math.round(data.totalValue * 100) / 100,
      totalUnits: data.totalUnits,
      itemCount: data.itemCount,
    });
  });

  // Sort chronologically ascending
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Returns top N inventory items sorted by total value in INR.
 */
export function getTopValuedItems(items: InventoryItemData[], limit = 5): InventoryItemData[] {
  return [...items]
    .sort((a, b) => (b.totalValue || (b.quantity * b.pricePerUnit)) - (a.totalValue || (a.quantity * a.pricePerUnit)))
    .slice(0, limit);
}
