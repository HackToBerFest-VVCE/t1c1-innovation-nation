import React, { useState } from 'react';
import { ShoppingCart, X, Minus, Plus, AlertTriangle, Check } from 'lucide-react';
import type { InventoryItemData } from '../utils/inventoryUtils.ts';
import { formatINR } from '../utils/inventoryUtils.ts';

interface SellModalProps {
  item: InventoryItemData | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSell: (itemId: string, soldQty: number) => Promise<void>;
}

export const SellModal: React.FC<SellModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirmSell,
}) => {
  if (!isOpen || !item || !item.id) return null;

  const [soldQuantity, setSoldQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const currentStock = item.quantity;
  const remainingStock = Math.max(0, currentStock - soldQuantity);
  const isRemainingLow = remainingStock < 5 && remainingStock > 0;
  const isRemainingZero = remainingStock === 0;

  const handleQuickSelect = (qty: number) => {
    setSoldQuantity(Math.min(currentStock, Math.max(1, qty)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.id || soldQuantity <= 0) return;

    setIsSubmitting(true);
    try {
      await onConfirmSell(item.id, soldQuantity);
      onClose();
    } catch (err) {
      console.error('Error recording sale:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Record Stock Sale
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Deplete inventory quantity for this item
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Item Details Box */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {item.itemName}
              </span>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Category: {item.category || 'General'}
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
              Current: {currentStock} units
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <span>Price: {formatINR(item.pricePerUnit)}/unit</span>
            <span>Total Value: {formatINR(item.totalValue)}</span>
          </div>
        </div>

        {/* Sale Quantity Selector */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Units Sold / Depleted:
            </label>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setSoldQuantity(Math.max(1, soldQuantity - 1))}
                disabled={soldQuantity <= 1}
                className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="number"
                min={1}
                max={currentStock}
                value={soldQuantity}
                onChange={(e) => setSoldQuantity(Math.min(currentStock, Math.max(1, parseInt(e.target.value) || 1)))}
                className="flex-1 text-center font-bold text-xl py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              <button
                type="button"
                onClick={() => setSoldQuantity(Math.min(currentStock, soldQuantity + 1))}
                disabled={soldQuantity >= currentStock}
                className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Quick selector buttons */}
            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => handleQuickSelect(1)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Sell 1
              </button>
              {currentStock >= 5 && (
                <button
                  type="button"
                  onClick={() => handleQuickSelect(5)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Sell 5
                </button>
              )}
              {currentStock >= 10 && (
                <button
                  type="button"
                  onClick={() => handleQuickSelect(10)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Sell 10
                </button>
              )}
              <button
                type="button"
                onClick={() => handleQuickSelect(currentStock)}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 cursor-pointer ml-auto"
              >
                Sell All ({currentStock})
              </button>
            </div>
          </div>

          {/* Real-time Aftermath Prediction */}
          <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Sale revenue / value:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {formatINR(soldQuantity * item.pricePerUnit)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Remaining inventory:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {remainingStock} units
              </span>
            </div>

            {isRemainingZero && (
              <div className="mt-1 flex items-center text-rose-600 dark:text-rose-400 text-[11px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
                <span>Stock will reach 0 units (Out of stock).</span>
              </div>
            )}

            {isRemainingLow && (
              <div className="mt-1 flex items-center text-amber-600 dark:text-amber-400 text-[11px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
                <span>Stock will drop below 5 units (Low Stock alert).</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || soldQuantity <= 0}
              className="flex items-center space-x-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating...' : `Confirm Sale (-${soldQuantity})`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
