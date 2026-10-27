import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, X, Trash2 } from 'lucide-react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => Promise<void>;
  itemsCount: number;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
  itemsCount,
}) => {
  if (!isOpen) return null;

  const [isResetting, setIsResetting] = useState(false);

  const handleConfirm = async () => {
    setIsResetting(true);
    try {
      await onConfirmReset();
      onClose();
    } catch (err) {
      console.error('Failed to reset inventory:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Reset Entire Inventory
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Permanently clear stock and start over
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

        <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-300 space-y-2">
          <p className="font-semibold">
            Are you sure you want to completely reset your inventory?
          </p>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            This will permanently delete all <strong>{itemsCount} stock items</strong> and previous invoice logs from your database. Your dashboard will return to a completely blank state ready for new invoices.
          </p>
        </div>

        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isResetting}
            className="flex items-center space-x-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-rose-600 hover:bg-rose-500 shadow-md shadow-rose-600/30 transition cursor-pointer disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isResetting ? 'Resetting...' : 'Yes, Delete All & Reset'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
