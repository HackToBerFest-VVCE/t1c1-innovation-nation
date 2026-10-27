import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Calendar, 
  ShieldAlert, 
  Layers, 
  Sparkles,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import type { InventoryItemData } from '../utils/inventoryUtils.ts';
import { 
  formatINR, 
  formatDateDisplay, 
  getCategoryBreakdown, 
  getTimelineBreakdown, 
  getTopValuedItems,
  isLowStock
} from '../utils/inventoryUtils.ts';

interface DataVisualizationProps {
  items: InventoryItemData[];
  onSelectCategory?: (category: string) => void;
  onFilterLowStock?: () => void;
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({
  items,
  onSelectCategory,
  onFilterLowStock,
}) => {
  const [metricType, setMetricType] = useState<'value' | 'units'>('value');
  const [activeTab, setActiveTab] = useState<'categories' | 'timeline' | 'health'>('categories');

  if (items.length === 0) {
    return null;
  }

  const categoryBreakdown = getCategoryBreakdown(items);
  const timelineData = getTimelineBreakdown(items);
  const topItems = getTopValuedItems(items, 5);

  // Stock health counts
  const outOfStockItems = items.filter(i => i.quantity === 0);
  const lowStockItems = items.filter(i => i.quantity > 0 && i.quantity < 5);
  const healthyStockItems = items.filter(i => i.quantity >= 5);

  const lowStockRiskValue = lowStockItems.reduce((acc, curr) => acc + (curr.totalValue || curr.quantity * curr.pricePerUnit), 0);
  const grandTotalValue = items.reduce((acc, curr) => acc + (curr.totalValue || curr.quantity * curr.pricePerUnit), 0);
  const grandTotalUnits = items.reduce((acc, curr) => acc + curr.quantity, 0);

  // Maximum values for proportional SVG bars
  const maxCategoryVal = categoryBreakdown.reduce((m, c) => Math.max(m, metricType === 'value' ? c.totalValue : c.totalUnits), 0) || 1;
  const maxTimelineVal = timelineData.reduce((m, d) => Math.max(m, metricType === 'value' ? d.totalValue : d.totalUnits), 0) || 1;

  // Category palette
  const getCatColor = (idx: number) => {
    const colors = [
      'bg-emerald-500 text-white',
      'bg-teal-500 text-white',
      'bg-cyan-500 text-white',
      'bg-blue-500 text-white',
      'bg-indigo-500 text-white',
      'bg-violet-500 text-white',
      'bg-amber-500 text-white',
      'bg-rose-500 text-white',
    ];
    return colors[idx % colors.length];
  };

  const getCatBarBg = (idx: number) => {
    const bgs = [
      'bg-emerald-500',
      'bg-teal-500',
      'bg-cyan-500',
      'bg-blue-500',
      'bg-indigo-500',
      'bg-violet-500',
      'bg-amber-500',
      'bg-rose-500',
    ];
    return bgs[idx % bgs.length];
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
      {/* Top Header & Interactive Visual Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Inventory Data Analytics & Visualizations
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Interactive visual charts analyzing category distribution, date-based restocking trends, and stock health.
          </p>
        </div>

        {/* View and Metric Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab Selector */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('categories')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'categories'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Departments</span>
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'timeline'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Date Timeline</span>
            </button>
            <button
              onClick={() => setActiveTab('health')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition cursor-pointer ${
                activeTab === 'health'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Stock Health</span>
            </button>
          </div>

          {/* Metric Toggle: Value (₹) vs Units */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
            <button
              onClick={() => setMetricType('value')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                metricType === 'value'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Value (₹)
            </button>
            <button
              onClick={() => setMetricType('units')}
              className={`px-2.5 py-1.5 rounded-lg transition cursor-pointer ${
                metricType === 'units'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Units
            </button>
          </div>
        </div>
      </div>

      {/* Quick Summary Pill Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Top Department</span>
          <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 block truncate">
            {categoryBreakdown[0]?.category || 'None'}
          </span>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            {categoryBreakdown[0] ? formatINR(categoryBreakdown[0].totalValue) : '₹0'}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Avg Value / SKU</span>
          <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 block">
            {formatINR(items.length > 0 ? grandTotalValue / items.length : 0)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Across {items.length} unique products
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Stock Inflow Dates</span>
          <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5 block">
            {timelineData.length} recorded dates
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Latest: {formatDateDisplay(timelineData[timelineData.length - 1]?.date)}
          </span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Low Stock Risk (₹)</span>
          <span className={`text-sm font-extrabold mt-0.5 block ${lowStockItems.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
            {formatINR(lowStockRiskValue)}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {lowStockItems.length} items &lt; 5 units
          </span>
        </div>
      </div>

      {/* Tab 1: Category Distribution Breakdown */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Department Share ({metricType === 'value' ? 'Total Value in ₹' : 'Stock Units'})</span>
            <span>Click any category to filter table</span>
          </div>

          <div className="space-y-3">
            {categoryBreakdown.map((cat, idx) => {
              const currentVal = metricType === 'value' ? cat.totalValue : cat.totalUnits;
              const barPercent = Math.max(6, Math.round((currentVal / maxCategoryVal) * 100));

              return (
                <div
                  key={cat.category}
                  onClick={() => onSelectCategory && onSelectCategory(cat.category)}
                  className="group p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/60 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${getCatBarBg(idx)}`} />
                      <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                        {cat.category}
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        ({cat.itemCount} {cat.itemCount === 1 ? 'item' : 'items'})
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 font-semibold">
                      <span className="text-slate-900 dark:text-white font-bold">
                        {metricType === 'value' ? formatINR(cat.totalValue) : `${cat.totalUnits} units`}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold min-w-[48px] text-right">
                        {cat.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getCatBarBg(idx)}`}
                      style={{ width: `${barPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: Date-based Restocking Timeline Visualizer */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Restocking Flow by Date ({metricType === 'value' ? 'Value in ₹' : 'Units Stocked'})</span>
            <span>Chronological Order</span>
          </div>

          {timelineData.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">No date records found.</div>
          ) : (
            <div className="space-y-3">
              {timelineData.map((point) => {
                const currentVal = metricType === 'value' ? point.totalValue : point.totalUnits;
                const barPercent = Math.max(8, Math.round((currentVal / maxTimelineVal) * 100));

                return (
                  <div
                    key={point.date}
                    className="p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {point.displayDate}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({point.date})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          • {point.itemCount} items
                        </span>
                      </div>

                      <div className="font-bold text-slate-900 dark:text-white">
                        {metricType === 'value' ? formatINR(point.totalValue) : `${point.totalUnits} units`}
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="w-full h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-500"
                        style={{ width: `${barPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Stock Health & Risk Assessment */}
      {activeTab === 'health' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* Healthy Stock Card */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Healthy Stock (&ge; 5 units)</span>
                <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-400">
                  {healthyStockItems.length}
                </span>
              </div>
              <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80">
                Safe supply levels across standard retail inventory.
              </div>
            </div>

            {/* Low Stock Warning Card */}
            <div 
              onClick={onFilterLowStock}
              className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/60 space-y-2 cursor-pointer hover:border-amber-400 transition"
              title="Click to filter low stock items"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center space-x-1">
                  <span>Low Stock (&lt; 5 units)</span>
                  <ArrowUpRight className="w-3 h-3" />
                </span>
                <span className="text-base font-extrabold text-amber-700 dark:text-amber-400">
                  {lowStockItems.length}
                </span>
              </div>
              <div className="text-[11px] text-amber-700/80 dark:text-amber-400/80">
                Requires restocking soon. Click to filter in table.
              </div>
            </div>

            {/* Out of Stock Card */}
            <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Out of Stock (0 units)</span>
                <span className="text-base font-extrabold text-rose-700 dark:text-rose-400">
                  {outOfStockItems.length}
                </span>
              </div>
              <div className="text-[11px] text-rose-700/80 dark:text-rose-400/80">
                Depleted products requiring urgent reorder from distributor.
              </div>
            </div>
          </div>

          {/* Top 5 Most Valuable Stock Lines */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
              Top 5 High-Value Stock Assets
            </h4>
            <div className="space-y-2">
              {topItems.map((item, i) => (
                <div
                  key={item.id || item.itemName}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-300">
                      #{i + 1}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item.itemName}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({item.quantity} units @ {formatINR(item.pricePerUnit)})
                    </span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatINR(item.totalValue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
