import React from 'react';
import { Package, UploadCloud, AlertTriangle, TrendingUp, Layers } from 'lucide-react';
import { formatINR } from '../utils/inventoryUtils.ts';

interface MetricCardsProps {
  totalUnits: number;
  totalValue: number;
  recentUploadsCount: number;
  lastUploadTime?: string | null;
  lowStockCount: number;
  uniqueProductsCount: number;
  onFilterLowStock?: () => void;
  isLowStockFilterActive?: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({
  totalUnits,
  totalValue,
  recentUploadsCount,
  lastUploadTime,
  lowStockCount,
  uniqueProductsCount,
  onFilterLowStock,
  isLowStockFilterActive,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Items in Stock */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Items in Stock
          </span>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800">
            <Package className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {totalUnits.toLocaleString('en-IN')}
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            units
          </span>
        </div>
        <div className="mt-2 flex items-center text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          <Layers className="w-3.5 h-3.5 mr-1" />
          <span>Across {uniqueProductsCount} unique products</span>
        </div>
      </div>

      {/* 2. Total Inventory Value (INR) */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Inventory Value
          </span>
          <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-200/60 dark:border-teal-800 font-bold text-base">
            ₹
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatINR(totalValue)}
          </span>
        </div>
        <div className="mt-2 flex items-center text-xs text-teal-700 dark:text-teal-400 font-medium">
          <TrendingUp className="w-3.5 h-3.5 mr-1" />
          <span>Live real-time asset appraisal</span>
        </div>
      </div>

      {/* 3. Recent Uploads */}
      <div className="relative overflow-hidden p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm transition hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recent Uploads
          </span>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800">
            <UploadCloud className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {recentUploadsCount}
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            invoices processed
          </span>
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 truncate">
          {lastUploadTime ? `Last scan: ${lastUploadTime}` : 'Ready for first invoice'}
        </div>
      </div>

      {/* 4. Low Stock Alerts (< 5 units) */}
      <div 
        onClick={onFilterLowStock}
        className={`relative overflow-hidden p-5 rounded-2xl border transition cursor-pointer select-none ${
          isLowStockFilterActive
            ? 'bg-amber-100/70 dark:bg-amber-950/60 border-amber-400 dark:border-amber-700 shadow-sm'
            : lowStockCount > 0
            ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 hover:bg-amber-100/50'
            : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:shadow-md'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
            Low Stock Alerts
          </span>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
            lowStockCount > 0 
              ? 'bg-amber-100 dark:bg-amber-900/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className={`text-3xl font-extrabold tracking-tight ${
            lowStockCount > 0 ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-white'
          }`}>
            {lowStockCount}
          </span>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            items &lt; 5 units
          </span>
        </div>
        <div className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-400 flex items-center justify-between">
          <span>{lowStockCount > 0 ? 'Click to filter low stock' : 'All stock healthy'}</span>
          {isLowStockFilterActive && (
            <span className="underline ml-1">Clear filter</span>
          )}
        </div>
      </div>
    </div>
  );
};
