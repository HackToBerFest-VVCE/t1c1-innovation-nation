import React, { useState } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  Edit2, 
  Trash2, 
  ShoppingCart, 
  AlertTriangle, 
  Check, 
  X, 
  Download, 
  Plus, 
  LayoutGrid, 
  Table as TableIcon,
  PackageCheck,
  Calendar
} from 'lucide-react';
import type { InventoryItemData } from '../utils/inventoryUtils.ts';
import { isLowStock, formatINR, formatDateDisplay } from '../utils/inventoryUtils.ts';

interface InventoryTableProps {
  items: InventoryItemData[];
  onUpdateItem: (itemId: string, updates: Partial<InventoryItemData>) => Promise<void>;
  onDeleteItem: (itemId: string) => Promise<void>;
  onOpenSellModal: (item: InventoryItemData) => void;
  onOpenAddModal: () => void;
  filterType: string;
  setFilterType: (filter: string) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onUpdateItem,
  onDeleteItem,
  onOpenSellModal,
  onOpenAddModal,
  filterType,
  setFilterType,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortField, setSortField] = useState<'itemName' | 'quantity' | 'pricePerUnit' | 'totalValue' | 'date'>('itemName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Inline editing state: { itemId, field: 'quantity' | 'pricePerUnit' | 'itemName' | 'date', value: string }
  const [editingCell, setEditingCell] = useState<{
    itemId: string;
    field: 'quantity' | 'pricePerUnit' | 'itemName' | 'date';
    value: string;
  } | null>(null);

  // In-app deletion confirmation modal state (replaces window.confirm which is blocked in iframes)
  const [itemToDelete, setItemToDelete] = useState<InventoryItemData | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Extract distinct categories
  const categories = Array.from(new Set(items.map(i => i.category || 'General').filter(Boolean)));

  // Filter items
  const filteredItems = items.filter(item => {
    // Search
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      item.itemName.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q)) ||
      (item.date && item.date.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    // Filter
    if (filterType === 'all') return true;
    if (filterType === 'low-stock') return item.quantity < 5;
    if (filterType === 'out-of-stock') return item.quantity === 0;
    if (filterType.startsWith('cat:')) {
      const targetCat = filterType.replace('cat:', '').toLowerCase();
      return (item.category || '').toLowerCase() === targetCat;
    }

    return true;
  });

  // Sort items
  const sortedItems = [...filteredItems].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'itemName') {
      comparison = a.itemName.localeCompare(b.itemName, undefined, { sensitivity: 'base' });
    } else if (sortField === 'date') {
      comparison = (a.date || '').localeCompare(b.date || '');
    } else {
      const valA = Number(a[sortField]) || 0;
      const valB = Number(b[sortField]) || 0;
      comparison = valA - valB;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const startInlineEdit = (item: InventoryItemData, field: 'quantity' | 'pricePerUnit' | 'itemName' | 'date') => {
    if (!item.id) return;
    setEditingCell({
      itemId: item.id,
      field,
      value: String(item[field] || ''),
    });
  };

  const cancelInlineEdit = () => {
    setEditingCell(null);
  };

  const saveInlineEdit = async (item: InventoryItemData) => {
    if (!editingCell || !item.id) return;

    const { field, value } = editingCell;
    setSavingId(item.id);

    try {
      if (field === 'quantity') {
        const newQty = Math.max(0, parseInt(value) || 0);
        const newTotal = Math.round(newQty * item.pricePerUnit * 100) / 100;
        await onUpdateItem(item.id, {
          quantity: newQty,
          totalValue: newTotal,
        });
      } else if (field === 'pricePerUnit') {
        const newPrice = Math.max(0, parseFloat(value) || 0);
        const roundedPrice = Math.round(newPrice * 100) / 100;
        const newTotal = Math.round(item.quantity * roundedPrice * 100) / 100;
        await onUpdateItem(item.id, {
          pricePerUnit: roundedPrice,
          totalValue: newTotal,
        });
      } else if (field === 'itemName') {
        const cleanName = value.trim().slice(0, 150) || item.itemName;
        await onUpdateItem(item.id, { itemName: cleanName });
      } else if (field === 'date') {
        const cleanDate = value.trim() || item.date;
        await onUpdateItem(item.id, { date: cleanDate });
      }
      setEditingCell(null);
    } catch (err) {
      console.error('Failed to update inline:', err);
    } finally {
      setSavingId(null);
    }
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete?.id) return;
    setIsDeleting(true);
    try {
      await onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
    } catch (err) {
      console.error('Failed to delete item:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const exportToCsv = () => {
    if (items.length === 0) return;
    const headers = ['Item Name', 'Category', 'Date', 'Quantity', 'Price Per Unit (INR)', 'Total Value (INR)', 'Source Invoice'];
    const rows = items.map(i => [
      `"${i.itemName.replace(/"/g, '""')}"`,
      `"${(i.category || 'General').replace(/"/g, '""')}"`,
      `"${(i.date || '').replace(/"/g, '""')}"`,
      i.quantity,
      i.pricePerUnit.toFixed(2),
      i.totalValue.toFixed(2),
      `"${(i.sourceInvoice || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EcoRetail_Inventory_INR_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
      {/* Top Controls Bar */}
      <div className="p-5 sm:p-6 border-b border-slate-200/80 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Live Retail Inventory</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {items.length} items
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click any quantity or price to edit inline. Flagged with low stock alerts below 5 units.
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center space-x-2">
            <button
              onClick={exportToCsv}
              disabled={items.length === 0}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:opacity-40"
              title="Export current inventory list as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>

            {/* View switcher */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Table view"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
                title="Card grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Chips Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items by name or department..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Items ({items.length})
            </button>

            <button
              onClick={() => setFilterType('low-stock')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer flex items-center space-x-1 ${
                filterType === 'low-stock'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/60 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              <span>Low Stock &lt; 5 ({items.filter(i => i.quantity < 5).length})</span>
            </button>

            {categories.slice(0, 4).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterType(`cat:${cat}`)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  filterType === `cat:${cat}`
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content: Table or Grid */}
      {items.length === 0 ? (
        /* Empty state for brand new user / blank initial experience */
        <div className="py-20 px-6 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
            <PackageCheck className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Your Inventory is Ready & Blank
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Welcome to EcoRetail! Upload an invoice image above, snap a photo with your camera, or click one of the 1-click sample bills to watch your inventory dashboard rise in real time.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Or Add First Item Manually</span>
            </button>
          </div>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="py-16 px-6 text-center text-slate-500 dark:text-slate-400 text-xs">
          No inventory items matched your search "{searchQuery}" or selected filter.
        </div>
      ) : viewMode === 'table' ? (
        /* Responsive Data Table */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
              <tr>
                <th
                  onClick={() => toggleSort('itemName')}
                  className="py-3.5 px-4 sm:px-6 cursor-pointer hover:text-slate-900 dark:hover:text-white transition select-none"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Item Name (A-Z)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Category</th>
                <th
                  onClick={() => toggleSort('date')}
                  className="py-3.5 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition select-none"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('quantity')}
                  className="py-3.5 px-4 text-center cursor-pointer hover:text-slate-900 dark:hover:text-white transition select-none"
                >
                  <div className="flex items-center justify-center space-x-1.5">
                    <span>Quantity</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('pricePerUnit')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition select-none"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Unit Price (₹)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('totalValue')}
                  className="py-3.5 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition select-none"
                >
                  <div className="flex items-center justify-end space-x-1.5">
                    <span>Total Value (₹)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Stock Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {sortedItems.map(item => {
                const isItemLow = isLowStock(item.quantity);
                const isEditingQty = editingCell?.itemId === item.id && editingCell?.field === 'quantity';
                const isEditingPrice = editingCell?.itemId === item.id && editingCell?.field === 'pricePerUnit';
                const isEditingName = editingCell?.itemId === item.id && editingCell?.field === 'itemName';
                const isEditingDate = editingCell?.itemId === item.id && editingCell?.field === 'date';

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isItemLow
                        ? 'bg-amber-50/40 dark:bg-amber-950/15 hover:bg-amber-50/70 dark:hover:bg-amber-950/30'
                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Item Name (Editable) */}
                    <td className="py-3.5 px-4 sm:px-6">
                      {isEditingName ? (
                        <div className="flex items-center space-x-1.5">
                          <input
                            type="text"
                            autoFocus
                            value={editingCell?.value || ''}
                            onChange={(e) => setEditingCell(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(item);
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                            className="px-2 py-1 text-xs rounded-lg border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none w-48"
                          />
                          <button
                            onClick={() => saveInlineEdit(item)}
                            className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelInlineEdit}
                            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startInlineEdit(item, 'itemName')}
                          className="group/name flex items-center space-x-1.5 cursor-pointer"
                          title="Click to edit item name"
                        >
                          <span className="font-bold text-slate-900 dark:text-slate-100 group-hover/name:text-emerald-600 transition-colors">
                            {item.itemName}
                          </span>
                          <Edit2 className="w-3 h-3 text-slate-400 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                        </div>
                      )}
                      {item.sourceInvoice && (
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[200px] mt-0.5">
                          From: {item.sourceInvoice}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                        {item.category || 'General'}
                      </span>
                    </td>

                    {/* Date (Inline Editable) */}
                    <td className="py-3.5 px-4">
                      {isEditingDate ? (
                        <div className="flex items-center space-x-1">
                          <input
                            type="date"
                            autoFocus
                            value={editingCell?.value || ''}
                            onChange={(e) => setEditingCell(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(item);
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                            className="px-2 py-1 text-xs rounded-lg border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                          />
                          <button
                            onClick={() => saveInlineEdit(item)}
                            className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelInlineEdit}
                            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startInlineEdit(item, 'date')}
                          className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition group/date"
                          title="Click to edit date"
                        >
                          <Calendar className="w-3 h-3 text-slate-400 group-hover/date:text-emerald-600 shrink-0" />
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {formatDateDisplay(item.date)}
                          </span>
                          <Edit2 className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/date:opacity-100 shrink-0" />
                        </div>
                      )}
                    </td>

                    {/* Quantity (Inline Editable) */}
                    <td className="py-3.5 px-4 text-center">
                      {isEditingQty ? (
                        <div className="inline-flex items-center space-x-1">
                          <input
                            type="number"
                            min={0}
                            autoFocus
                            value={editingCell?.value || ''}
                            onChange={(e) => setEditingCell(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(item);
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                            className="w-16 px-2 py-1 text-center text-xs font-bold rounded-lg border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                          />
                          <button
                            onClick={() => saveInlineEdit(item)}
                            className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelInlineEdit}
                            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startInlineEdit(item, 'quantity')}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition group/qty"
                          title="Click to edit stock quantity"
                        >
                          <span className={`font-extrabold ${isItemLow ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {item.quantity}
                          </span>
                          <Edit2 className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/qty:opacity-100" />
                        </div>
                      )}
                    </td>

                    {/* Price Per Unit in INR (Inline Editable) */}
                    <td className="py-3.5 px-4 text-right">
                      {isEditingPrice ? (
                        <div className="inline-flex items-center space-x-1">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            autoFocus
                            value={editingCell?.value || ''}
                            onChange={(e) => setEditingCell(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineEdit(item);
                              if (e.key === 'Escape') cancelInlineEdit();
                            }}
                            className="w-24 px-2 py-1 text-right text-xs font-bold rounded-lg border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                          />
                          <button
                            onClick={() => saveInlineEdit(item)}
                            className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={cancelInlineEdit}
                            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => startInlineEdit(item, 'pricePerUnit')}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition group/price ml-auto"
                          title="Click to edit unit price (₹)"
                        >
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {formatINR(item.pricePerUnit)}
                          </span>
                          <Edit2 className="w-2.5 h-2.5 text-slate-400 opacity-0 group-hover/price:opacity-100" />
                        </div>
                      )}
                    </td>

                    {/* Total Value in INR */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white">
                      {formatINR(item.totalValue)}
                    </td>

                    {/* Stock Status Badge */}
                    <td className="py-3.5 px-4">
                      {item.quantity === 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                          Out of Stock
                        </span>
                      ) : item.quantity < 5 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Low Stock ({item.quantity})
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          In Stock
                        </span>
                      )}
                    </td>

                    {/* Actions: Mark as Sold & Delete */}
                    <td className="py-3.5 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Mark as Sold Button */}
                        <button
                          onClick={() => onOpenSellModal(item)}
                          disabled={item.quantity === 0}
                          className="flex items-center space-x-1 px-2.5 py-1.5 text-[11px] font-bold rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Record sale & subtract sold quantity"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Mark Sold</span>
                        </button>

                        {/* Working Delete Button (Opens in-app confirmation modal) */}
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                          title={`Permanently delete "${item.itemName}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Visual Card Grid View */
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedItems.map(item => {
            const isItemLow = isLowStock(item.quantity);

            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition relative flex flex-col justify-between ${
                  isItemLow
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-800'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-emerald-400'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">
                      {item.itemName}
                    </span>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        {item.category || 'General'}
                      </span>
                      {item.date && (
                        <span className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <Calendar className="w-2.5 h-2.5 mr-0.5" />
                          <span>{formatDateDisplay(item.date)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Quantity</span>
                      <span className={`text-base font-extrabold ${isItemLow ? 'text-amber-600 dark:text-amber-400' : 'text-slate-800 dark:text-slate-100'}`}>
                        {item.quantity} units
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-semibold uppercase">Unit Price</span>
                      <span className="text-base font-bold text-slate-800 dark:text-slate-100">
                        {formatINR(item.pricePerUnit)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 flex justify-between items-center text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Total Value:</span>
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {formatINR(item.totalValue)}
                    </span>
                  </div>

                  {isItemLow && (
                    <div className="mt-2 flex items-center text-amber-700 dark:text-amber-400 text-[11px] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                      <span>Low Stock Alert (&lt; 5 units)</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                  <button
                    onClick={() => setItemToDelete(item)}
                    className="p-1.5 text-xs text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition cursor-pointer"
                    title={`Delete "${item.itemName}"`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onOpenSellModal(item)}
                    disabled={item.quantity === 0}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer disabled:opacity-40"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Mark as Sold</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* In-app Item Deletion Confirmation Modal (Guaranteed to work without iframe blocking) */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center space-x-2.5 text-rose-600 dark:text-rose-400">
              <div className="w-9 h-9 rounded-xl bg-rose-100 dark:bg-rose-950/80 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Delete Item</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Remove from inventory</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to permanently remove <strong className="text-slate-900 dark:text-white">"{itemToDelete.itemName}"</strong> ({itemToDelete.quantity} units)?
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                disabled={isDeleting}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 transition cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Item'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
