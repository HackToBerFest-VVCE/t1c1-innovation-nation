import React from 'react';
import { Leaf, Moon, Sun, LogOut, Sparkles, RotateCcw, Trash2 } from 'lucide-react';
import type { User } from 'firebase/auth';

interface NavbarProps {
  user: User | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout: () => void;
  onResetInventory?: () => void;
  hasItems?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  darkMode,
  onToggleDarkMode,
  onLogout,
  onResetInventory,
  hasItems = false,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-emerald-100/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 ring-2 ring-emerald-500/30">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                Eco<span className="text-emerald-600 dark:text-emerald-400">Retail</span>
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Sparkles className="w-2.5 h-2.5 mr-0.5 text-emerald-600 dark:text-emerald-400" />
                Vision AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Smart Sustainable Inventory Intelligence
            </p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Reset Inventory Button (Beside Dark/Light Toggle) */}
          {user && onResetInventory && (
            <button
              onClick={onResetInventory}
              aria-label="Reset all inventory"
              className="flex items-center space-x-1.5 px-2.5 py-2 rounded-lg text-rose-700 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 transition cursor-pointer border border-rose-200/80 dark:border-rose-900/60 shadow-xs group"
              title="Completely reset inventory to start again"
            >
              <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400 group-hover:-rotate-90 transition-transform" />
              <span className="hidden sm:inline text-xs font-semibold">Reset Stock</span>
            </button>
          )}

          {/* Dark Mode Toggle */}
          <button
            onClick={onToggleDarkMode}
            aria-label="Toggle dark mode"
            className="p-2 rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {user && (
            <>
              {/* User badge */}
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full border border-emerald-500/40 object-cover ring-1 ring-emerald-500/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden md:block text-left text-xs leading-tight">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                    {user.displayName || 'Store Manager'}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">
                    {user.email}
                  </div>
                </div>
              </div>

              {/* Secure Logout button inside dashboard header */}
              <button
                onClick={onLogout}
                className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition border border-slate-200 dark:border-slate-700 cursor-pointer shadow-xs"
                title="Sign out of EcoRetail"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
