import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sortItemsAlphabetically,
  calculateInventoryTotals,
  isLowStock,
  depleteItemQuantity,
  sanitizeInventoryItem,
  filterInventory,
  formatINR,
  formatDateDisplay,
  getCategoryBreakdown,
  getTimelineBreakdown
} from './inventoryUtils.ts';

test('formatINR formats currency with Indian rupee symbol and commas', () => {
  assert.equal(formatINR(1250), '₹1,250.00');
  assert.equal(formatINR(150000), '₹1,50,000.00');
  assert.equal(formatINR(45.5), '₹45.50');
  assert.equal(formatINR(0), '₹0.00');
});

test('formatDateDisplay formats YYYY-MM-DD cleanly without timezone offset shift', () => {
  assert.equal(formatDateDisplay('2026-10-26'), '26 Oct 2026');
  assert.equal(formatDateDisplay(''), 'N/A');
  assert.equal(formatDateDisplay(undefined), 'N/A');
});

test('sortItemsAlphabetically sorts items ascending by item name ignoring case', () => {
  const items = [
    { itemName: 'Zucchini Organic' },
    { itemName: 'Apples Gala' },
    { itemName: 'bananas Fair Trade' },
    { itemName: 'Carrots Bunch' }
  ];

  const sorted = sortItemsAlphabetically(items);
  assert.equal(sorted[0].itemName, 'Apples Gala');
  assert.equal(sorted[1].itemName, 'bananas Fair Trade');
  assert.equal(sorted[2].itemName, 'Carrots Bunch');
  assert.equal(sorted[3].itemName, 'Zucchini Organic');
});

test('calculateInventoryTotals correctly sums stock units and values', () => {
  const items = [
    { userId: 'u1', itemName: 'Milk 1L', quantity: 10, pricePerUnit: 3.5, totalValue: 35 },
    { userId: 'u1', itemName: 'Eggs 12pk', quantity: 4, pricePerUnit: 4.25, totalValue: 17 }, // low stock (< 5)
    { userId: 'u1', itemName: 'Bread Sourdough', quantity: 0, pricePerUnit: 5.0, totalValue: 0 }, // out of stock
  ];

  const totals = calculateInventoryTotals(items);
  assert.equal(totals.totalUnits, 14);
  assert.equal(totals.totalValue, 52);
  assert.equal(totals.uniqueProductsCount, 3);
  assert.equal(totals.lowStockCount, 2); // 4 is < 5, and 0 is also < 5
  assert.equal(totals.outOfStockCount, 1);
});

test('isLowStock returns true when quantity drops below 5', () => {
  assert.equal(isLowStock(0), true);
  assert.equal(isLowStock(4), true);
  assert.equal(isLowStock(5), false);
  assert.equal(isLowStock(20), false);
});

test('depleteItemQuantity decrements sold stock and prevents negative stock', () => {
  assert.equal(depleteItemQuantity(10, 3), 7);
  assert.equal(depleteItemQuantity(4, 5), 0);
  assert.equal(depleteItemQuantity(5, 0), 5);
  assert.equal(depleteItemQuantity(5, -2), 5);
});

test('sanitizeInventoryItem normalizes values, prevents negative numbers, and standardizes date', () => {
  const sanitized = sanitizeInventoryItem(
    {
      itemName: '   Organic Matcha Powder   ',
      quantity: -5,
      pricePerUnit: 14.994,
      totalValue: 0,
      category: 'Beverages',
      date: '2026-10-26'
    },
    'user-123'
  );

  assert.equal(sanitized.userId, 'user-123');
  assert.equal(sanitized.itemName, 'Organic Matcha Powder');
  assert.equal(sanitized.quantity, 0); // clamped to 0
  assert.equal(sanitized.pricePerUnit, 14.99);
  assert.equal(sanitized.category, 'Beverages');
  assert.equal(sanitized.date, '2026-10-26');
});

test('filterInventory filters by query, category, and date', () => {
  const items = [
    { userId: 'u1', itemName: 'Almond Milk', category: 'Dairy', date: '2026-10-25', quantity: 12, pricePerUnit: 3.99, totalValue: 47.88 },
    { userId: 'u1', itemName: 'Oat Milk', category: 'Dairy', date: '2026-10-26', quantity: 3, pricePerUnit: 4.29, totalValue: 12.87 },
    { userId: 'u1', itemName: 'Green Tea', category: 'Beverages', date: '2026-10-26', quantity: 0, pricePerUnit: 6.50, totalValue: 0 }
  ];

  const lowStock = filterInventory(items, '', 'low-stock');
  assert.equal(lowStock.length, 1);
  assert.equal(lowStock[0].itemName, 'Oat Milk');

  const teaSearch = filterInventory(items, 'tea', 'all');
  assert.equal(teaSearch.length, 1);
  assert.equal(teaSearch[0].itemName, 'Green Tea');

  const dateSearch = filterInventory(items, '2026-10-25', 'all');
  assert.equal(dateSearch.length, 1);
  assert.equal(dateSearch[0].itemName, 'Almond Milk');
});

test('getCategoryBreakdown computes aggregations and percentages descending by value', () => {
  const items = [
    { userId: 'u1', itemName: 'Apple', category: 'Produce', quantity: 10, pricePerUnit: 100, totalValue: 1000 },
    { userId: 'u1', itemName: 'Banana', category: 'Produce', quantity: 5, pricePerUnit: 40, totalValue: 200 },
    { userId: 'u1', itemName: 'Green Tea', category: 'Beverages', quantity: 2, pricePerUnit: 400, totalValue: 800 }
  ];

  const breakdown = getCategoryBreakdown(items);
  assert.equal(breakdown.length, 2);
  assert.equal(breakdown[0].category, 'Produce');
  assert.equal(breakdown[0].totalValue, 1200);
  assert.equal(breakdown[0].totalUnits, 15);
  assert.equal(breakdown[0].percentage, 60);

  assert.equal(breakdown[1].category, 'Beverages');
  assert.equal(breakdown[1].totalValue, 800);
  assert.equal(breakdown[1].percentage, 40);
});

test('getTimelineBreakdown groups stock records chronologically by date', () => {
  const items = [
    { userId: 'u1', itemName: 'Item B', date: '2026-10-26', quantity: 4, pricePerUnit: 50, totalValue: 200 },
    { userId: 'u1', itemName: 'Item A', date: '2026-10-25', quantity: 10, pricePerUnit: 10, totalValue: 100 },
    { userId: 'u1', itemName: 'Item C', date: '2026-10-26', quantity: 2, pricePerUnit: 150, totalValue: 300 }
  ];

  const timeline = getTimelineBreakdown(items);
  assert.equal(timeline.length, 2);
  assert.equal(timeline[0].date, '2026-10-25');
  assert.equal(timeline[0].totalValue, 100);
  assert.equal(timeline[0].totalUnits, 10);

  assert.equal(timeline[1].date, '2026-10-26');
  assert.equal(timeline[1].totalValue, 500);
  assert.equal(timeline[1].totalUnits, 6);
});
