import React, { useState } from 'react';
import { Leaf, Sparkles, ShieldCheck, ArrowRight, Camera, Receipt, BarChart3, AlertCircle, Sun, Moon } from 'lucide-react';

interface AuthScreenProps {
  onSignIn: () => Promise<void>;
  onDemoSignIn?: () => void;
  isLoading: boolean;
  error: string | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onSignIn,
  onDemoSignIn,
  isLoading,
  error,
  darkMode,
  onToggleDarkMode,
}) => {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 transition-colors selection:bg-emerald-500 selection:text-white">
      {/* Top bar with logo and theme toggle */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Leaf className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
            Eco<span className="text-emerald-600 dark:text-emerald-400">Retail</span>
          </span>
        </div>

        <button
          onClick={onToggleDarkMode}
          className="p-2 rounded-lg text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer"
          title="Toggle light/dark theme"
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

      {/* Main Hero & Auth Card */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-12">
        {/* Left Column: Product Value Narrative */}
        <div className="flex-1 max-w-xl text-left space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span>AI-Powered Optical Invoice Scanner</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
            Turn Paper Invoices into{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 bg-clip-text text-transparent">
              Live Stock Intelligence
            </span>
          </h1>

          <p className="text-slate-600 dark:text-slate-300 text-base sm:text-lg leading-relaxed">
            EcoRetail empowers sustainable independent grocers and boutique retailers to scan paper bills, automatically extract stock items with Gemma Vision, track real-time depletion, and eliminate waste.
          </p>

          {/* Key Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Snap & Scan</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Camera or invoice upload</div>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <Receipt className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Auto Extraction</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Qty, price & line totals</div>
              </div>
            </div>

            <div className="flex items-start space-x-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Live Depletion</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Low-stock alerts & sync</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Google Sign-in Card */}
        <div className="w-full max-w-md">
          <div className="relative p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl shadow-emerald-950/5">
            {/* Subtle glow background */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="text-center space-y-2 mb-8">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                Store Manager Access
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sign in with your verified Google Account to access your private encrypted retail inventory.
              </p>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-6 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Prominent Google Sign-In Button */}
            <button
              onClick={onSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-3 py-3.5 px-4 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-100 font-semibold text-sm border border-slate-300 dark:border-slate-700 shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              {/* Google 4-color SVG Icon */}
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>

              <span>{isLoading ? 'Connecting to Google...' : 'Sign in with Google'}</span>
              <ArrowRight className="w-4 h-4 ml-1 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* Instant Demo Store Access */}
            {onDemoSignIn && (
              <div className="mt-3 text-center">
                <button
                  type="button"
                  onClick={onDemoSignIn}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 transition cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Try Demo Store (Instant Access)</span>
                </button>
              </div>
            )}

            {/* Security disclaimer */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Zero-Trust Firebase ABAC security enabled. Each retailer's inventory data is isolated and strictly accessible only to their authenticated account.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-slate-800/80">
        EcoRetail Platform • Built with Firebase Auth, Cloud Firestore & Gemma Vision AI
      </footer>
    </div>
  );
};
