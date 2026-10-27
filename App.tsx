/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  handleFirestoreError, 
  OperationType 
} from './firebase.ts';
import { Navbar } from './components/Navbar.tsx';
import { AuthScreen } from './components/AuthScreen.tsx';
import { MetricCards } from './components/MetricCards.tsx';
import { InvoiceScanner } from './components/InvoiceScanner.tsx';
import { DataVisualization } from './components/DataVisualization.tsx';
import { InventoryTable } from './components/InventoryTable.tsx';
import { SellModal } from './components/SellModal.tsx';
import { AddItemModal } from './components/AddItemModal.tsx';
import { ResetConfirmModal } from './components/ResetConfirmModal.tsx';
import { 
  InventoryItemData, 
  calculateInventoryTotals, 
  depleteItemQuantity, 
  sortItemsAlphabetically,
  sanitizeInventoryItem 
} from './utils/inventoryUtils.ts';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('ecoretail_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Inventory data state (real-time synced from Firestore)
  const [inventoryItems, setInventoryItems] = useState<InventoryItemData[]>([]);
  const [recentUploadsCount, setRecentUploadsCount] = useState<number>(0);
  const [lastUploadTime, setLastUploadTime] = useState<string | null>(null);
  const [isProcessingInvoice, setIsProcessingInvoice] = useState<boolean>(false);

  // UI Modals
  const [activeSellItem, setActiveSellItem] = useState<InventoryItemData | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('all');

  // Sync dark class on html tag
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('ecoretail_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('ecoretail_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const createDemoUser = (): User => ({
    uid: 'demo_store_manager',
    displayName: 'EcoRetail Manager (Demo)',
    email: 'demo@ecoretail.local',
    emailVerified: true,
    isAnonymous: false,
    metadata: {} as any,
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => '',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    photoURL: null,
    providerId: 'google.com'
  });

  const handleDemoSignIn = () => {
    setUser(createDemoUser());
    const initialSeed: InventoryItemData[] = sortItemsAlphabetically([
      {
        id: 'item_demo_1',
        userId: 'demo_store_manager',
        itemName: 'Organic Almond Milk 1L',
        quantity: 14,
        pricePerUnit: 180,
        totalValue: 2520,
        category: 'Dairy & Alternatives',
        date: new Date().toISOString().split('T')[0],
      },
      {
        id: 'item_demo_2',
        userId: 'demo_store_manager',
        itemName: 'Farm Fresh Brown Eggs (12pk)',
        quantity: 3, // Low stock (< 5)
        pricePerUnit: 120,
        totalValue: 360,
        category: 'Produce',
        date: new Date().toISOString().split('T')[0],
      },
      {
        id: 'item_demo_3',
        userId: 'demo_store_manager',
        itemName: 'Artisan Sourdough Loaf',
        quantity: 8,
        pricePerUnit: 150,
        totalValue: 1200,
        category: 'Bakery',
        date: new Date().toISOString().split('T')[0],
      },
    ]);
    setInventoryItems(initialSeed);
    setRecentUploadsCount(1);
    setLastUploadTime('Just now (Demo)');
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const isAutostart = typeof window !== 'undefined' && 
      (window.location.search.includes('autostart=1') || window.location.search.includes('demo=1'));

    if (isAutostart) {
      handleDemoSignIn();
      setAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Firestore sync for current user's inventory & invoices
  useEffect(() => {
    if (!user) {
      setInventoryItems([]);
      setRecentUploadsCount(0);
      setLastUploadTime(null);
      return;
    }

    // In demo mode, bypass Firestore sync to prevent permission errors
    if (user.uid === 'demo_store_manager') {
      return;
    }

    const inventoryPath = 'inventory';
    const inventoryQuery = query(
      collection(db, inventoryPath),
      where('userId', '==', user.uid)
    );

    const unsubInventory = onSnapshot(
      inventoryQuery,
      (snapshot) => {
        const loaded: InventoryItemData[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          loaded.push({
            id: docSnap.id,
            userId: data.userId,
            itemName: data.itemName,
            quantity: Number(data.quantity) || 0,
            pricePerUnit: Number(data.pricePerUnit) || 0,
            totalValue: Number(data.totalValue) || 0,
            category: data.category || 'General',
            date: data.date || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
            sourceInvoice: data.sourceInvoice,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });

        // Always sort items alphabetically by Item Name as requested
        const sorted = sortItemsAlphabetically(loaded);
        setInventoryItems(sorted);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, inventoryPath);
      }
    );

    // Also sync recent invoice upload logs
    const invoicesPath = 'invoices';
    const invoicesQuery = query(
      collection(db, invoicesPath),
      where('userId', '==', user.uid)
    );

    const unsubInvoices = onSnapshot(
      invoicesQuery,
      (snapshot) => {
        setRecentUploadsCount(snapshot.size);
        if (!snapshot.empty) {
          // Find the most recent invoice
          let latestDate: Date | null = null;
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.createdAt?.toDate) {
              const d = data.createdAt.toDate();
              if (!latestDate || d > latestDate) latestDate = d;
            }
          });
          if (latestDate) {
            setLastUploadTime((latestDate as Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, invoicesPath);
      }
    );

    return () => {
      unsubInventory();
      unsubInvoices();
    };
  }, [user]);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Firebase Auth sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in cancelled. Please allow the Google popup window to sign in.');
      } else if (err.code === 'auth/popup-blocked') {
        setAuthError('Google sign-in popup was blocked by your browser. Please allow popups for this applet.');
      } else {
        setAuthError(err.message || 'Failed to authenticate with Google Account.');
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error during logout:', err);
    }
  };

  // Core AI Vision Scan Complete: Save items directly to Firestore
  const handleScanComplete = async (extractedItems: Array<{ itemName: string; quantity: number; pricePerUnit: number; totalValue: number; category?: string; date?: string }>, fileName: string) => {
    if (!user) return;

    // Automatically sort extracted items alphabetically by Item Name as requested
    const sortedExtracted = sortItemsAlphabetically(extractedItems);
    const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let totalBatchAmount = 0;

    // In demo mode, update local state directly
    if (user.uid === 'demo_store_manager') {
      const newItems: InventoryItemData[] = sortedExtracted.map((item) => {
        const sanitized = sanitizeInventoryItem({
          ...item,
          date: item.date || new Date().toISOString().split('T')[0],
          sourceInvoice: fileName
        }, user.uid);
        totalBatchAmount += sanitized.totalValue;
        return {
          id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          ...sanitized
        };
      });

      setInventoryItems(prev => sortItemsAlphabetically([...prev, ...newItems]));
      setRecentUploadsCount(prev => prev + 1);
      setLastUploadTime('Just now (Demo)');
      return;
    }

    // Save each item directly into Firestore
    for (const item of sortedExtracted) {
      const sanitized = sanitizeInventoryItem({
        ...item,
        date: item.date || new Date().toISOString().split('T')[0],
        sourceInvoice: fileName
      }, user.uid);

      totalBatchAmount += sanitized.totalValue;
      const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      try {
        await setDoc(doc(db, 'inventory', itemId), {
          ...sanitized,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `inventory/${itemId}`);
      }
    }

    // Log the invoice record
    try {
      await setDoc(doc(db, 'invoices', invoiceId), {
        userId: user.uid,
        fileName: fileName.slice(0, 150),
        itemsCount: sortedExtracted.length,
        totalAmount: Math.round(totalBatchAmount * 100) / 100,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `invoices/${invoiceId}`);
    }
  };

  // Update item (inline edit verification and correction)
  const handleUpdateItem = async (itemId: string, updates: Partial<InventoryItemData>) => {
    if (!user) return;

    if (user.uid === 'demo_store_manager') {
      setInventoryItems(prev => prev.map(item => item.id === itemId ? { ...item, ...updates } : item));
      return;
    }

    try {
      await updateDoc(doc(db, 'inventory', itemId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${itemId}`);
    }
  };

  // Permanently delete single item (tested & working via in-app modal)
  const handleDeleteItem = async (itemId: string) => {
    if (!user) return;

    if (user.uid === 'demo_store_manager') {
      setInventoryItems(prev => prev.filter(item => item.id !== itemId));
      return;
    }

    try {
      await deleteDoc(doc(db, 'inventory', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `inventory/${itemId}`);
    }
  };

  // Deplete stock / Mark as Sold
  const handleConfirmSell = async (itemId: string, soldQty: number) => {
    const targetItem = inventoryItems.find(i => i.id === itemId);
    if (!targetItem || !user) return;

    const remainingQty = depleteItemQuantity(targetItem.quantity, soldQty);
    const remainingTotal = Math.round(remainingQty * targetItem.pricePerUnit * 100) / 100;

    if (user.uid === 'demo_store_manager') {
      setInventoryItems(prev => prev.map(item => item.id === itemId ? { ...item, quantity: remainingQty, totalValue: remainingTotal } : item));
      return;
    }

    try {
      await updateDoc(doc(db, 'inventory', itemId), {
        quantity: remainingQty,
        totalValue: remainingTotal,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${itemId}`);
    }
  };

  // Manual Add Item
  const handleAddItem = async (newItem: Omit<InventoryItemData, 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    const sanitized = sanitizeInventoryItem(newItem, user.uid);
    const itemId = `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    if (user.uid === 'demo_store_manager') {
      const addedItem: InventoryItemData = {
        id: itemId,
        ...sanitized
      };
      setInventoryItems(prev => sortItemsAlphabetically([...prev, addedItem]));
      return;
    }

    try {
      await setDoc(doc(db, 'inventory', itemId), {
        ...sanitized,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `inventory/${itemId}`);
    }
  };

  // Completely reset inventory to start again (clears all items and invoices for current user)
  const handleResetInventory = async () => {
    if (!user) return;

    if (user.uid === 'demo_store_manager') {
      setInventoryItems([]);
      setRecentUploadsCount(0);
      setLastUploadTime(null);
      return;
    }

    try {
      const invQuery = query(collection(db, 'inventory'), where('userId', '==', user.uid));
      const invSnap = await getDocs(invQuery);

      const invoiceQuery = query(collection(db, 'invoices'), where('userId', '==', user.uid));
      const invoiceSnap = await getDocs(invoiceQuery);

      const batch = writeBatch(db);
      invSnap.forEach((d) => {
        batch.delete(d.ref);
      });
      invoiceSnap.forEach((d) => {
        batch.delete(d.ref);
      });

      await batch.commit();

      setInventoryItems([]);
      setRecentUploadsCount(0);
      setLastUploadTime(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'inventory/all');
    }
  };

  // Calculate metrics
  const totals = calculateInventoryTotals(inventoryItems);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Initializing EcoRetail...
          </p>
        </div>
      </div>
    );
  }

  // Not signed in -> Modern Auth Screen
  if (!user) {
    return (
      <AuthScreen
        onSignIn={handleGoogleSignIn}
        onDemoSignIn={handleDemoSignIn}
        isLoading={isSigningIn}
        error={authError}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />
    );
  }

  // Signed in -> Dashboard
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        user={user}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
        onResetInventory={() => setIsResetModalOpen(true)}
        hasItems={inventoryItems.length > 0}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-7">
        {/* Visual Metric Cards */}
        <MetricCards
          totalUnits={totals.totalUnits}
          totalValue={totals.totalValue}
          recentUploadsCount={recentUploadsCount}
          lastUploadTime={lastUploadTime}
          lowStockCount={totals.lowStockCount}
          uniqueProductsCount={totals.uniqueProductsCount}
          onFilterLowStock={() => setFilterType(prev => (prev === 'low-stock' ? 'all' : 'low-stock'))}
          isLowStockFilterActive={filterType === 'low-stock'}
        />

        {/* AI Invoice & Bill Scanner Section */}
        <InvoiceScanner
          onScanComplete={handleScanComplete}
          isProcessing={isProcessingInvoice}
          setIsProcessing={setIsProcessingInvoice}
        />

        {/* Interactive Data Visualization & Analytics Charts */}
        {inventoryItems.length > 0 && (
          <DataVisualization
            items={inventoryItems}
            onSelectCategory={(cat) => setFilterType(`cat:${cat}`)}
            onFilterLowStock={() => setFilterType('low-stock')}
          />
        )}

        {/* Live Inventory Data Table & Corrections */}
        <InventoryTable
          items={inventoryItems}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
          onOpenSellModal={(item) => setActiveSellItem(item)}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          filterType={filterType}
          setFilterType={setFilterType}
        />
      </main>

      {/* Depletion / Mark as Sold Modal */}
      <SellModal
        item={activeSellItem}
        isOpen={!!activeSellItem}
        onClose={() => setActiveSellItem(null)}
        onConfirmSell={handleConfirmSell}
      />

      {/* Manual Add Item Modal */}
      <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddItem={handleAddItem}
      />

      {/* Complete Inventory Reset Modal */}
      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirmReset={handleResetInventory}
        itemsCount={inventoryItems.length}
      />
    </div>
  );
}
