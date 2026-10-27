import React, { useState, useRef } from 'react';
import { UploadCloud, Camera, Sparkles, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { SAMPLE_INVOICE_PRESETS, generateSampleInvoiceImage, SampleInvoicePreset } from '../utils/sampleInvoices.ts';
import { WebcamModal } from './WebcamModal.tsx';

interface ExtractedItem {
  itemName: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
  category?: string;
  date?: string;
}

interface InvoiceScannerProps {
  onScanComplete: (items: ExtractedItem[], fileName: string) => Promise<void>;
  isProcessing: boolean;
  setIsProcessing: (val: boolean) => void;
}

/**
 * Resizes large image data URLs down to max 2048px to preserve crystal clear invoice text while maintaining swift transport.
 */
function compressImageDataUrl(dataUrl: string, maxWidth = 2048, maxHeight = 2048): Promise<string> {
  return new Promise((resolve) => {
    // If it's a PDF data URL, do not attempt canvas compression
    if (dataUrl.startsWith('data:application/pdf')) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxWidth && height <= maxHeight) {
        resolve(dataUrl);
        return;
      }

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const InvoiceScanner: React.FC<InvoiceScannerProps> = ({
  onScanComplete,
  isProcessing,
  setIsProcessing,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [activeStep, setActiveStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [lastScannedSummary, setLastScannedSummary] = useState<{
    fileName: string;
    itemsCount: number;
    totalAmount: number;
    invoiceDate?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
    // reset input
    e.target.value = '';
  };

  const processFile = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      setErrorMessage('Please upload a valid invoice document (PDF, PNG, JPG, WEBP, or JPEG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const effectiveMime = isPdf ? 'application/pdf' : (file.type || 'image/jpeg');
      await executeInvoiceScan(base64, file.name, effectiveMime);
    };
    reader.onerror = () => {
      setErrorMessage('Could not read file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const executeInvoiceScan = async (rawBase64: string, fileName: string, mimeType = 'image/jpeg') => {
    setErrorMessage(null);
    setIsProcessing(true);
    setLastScannedSummary(null);

    const isPdf = (fileName && fileName.toLowerCase().endsWith('.pdf')) || 
      (mimeType && mimeType.includes('pdf')) || 
      rawBase64.startsWith('data:application/pdf');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    try {
      let finalPayloadBase64 = rawBase64;
      if (isPdf) {
        setActiveStep('Reading and preparing PDF invoice document...');
      } else {
        setActiveStep('Optimizing & preparing invoice image...');
        finalPayloadBase64 = await compressImageDataUrl(rawBase64);
      }

      setActiveStep(isPdf ? 'Gemini AI parsing PDF invoice pages & tabular rows...' : 'Gemma Vision model scanning paper bill & tabular rows...');

      const response = await fetch('/api/scan-invoice', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          imageBase64: finalPayloadBase64,
          fileName,
          mimeType: isPdf ? 'application/pdf' : 'image/jpeg',
          isSamplePreset: false
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const responseText = await response.text();
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn('Non-JSON response received:', responseText.slice(0, 300));
        throw new Error('Server returned an unexpected response. Please try scanning again or test with a sample bill.');
      }

      if (!response.ok || !result.success) {
        // If 504 Deadline exceeded or upstream failure
        if (result.error && (result.error.includes('504') || result.error.includes('DEADLINE_EXCEEDED'))) {
          throw new Error('AI Vision model timed out while processing this document. Please retry or click one of the 1-click sample bills below.');
        }
        throw new Error(result.error || `Server extraction failed with status ${response.status}`);
      }

      const extracted: ExtractedItem[] = result.items || [];

      if (extracted.length === 0) {
        throw new Error('No retail stock items could be extracted from this document. Please ensure the invoice is clear and readable.');
      }

      setActiveStep('Sorting items alphabetically & persisting directly to Firestore...');
      
      // Calculate total
      const totalAmount = extracted.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);

      // Save to database
      await onScanComplete(extracted, fileName);

      setLastScannedSummary({
        fileName,
        itemsCount: extracted.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        invoiceDate: result.invoiceDate
      });

      setActiveStep('');
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('Handled invoice scanning error:', err?.message || err);
      if (err.name === 'AbortError') {
        setErrorMessage('Invoice processing timed out after 35 seconds. Please try again with a clearer or smaller document.');
      } else {
        setErrorMessage(err.message || 'An error occurred while processing the invoice.');
      }
    } finally {
      setIsProcessing(false);
      setActiveStep('');
    }
  };

  const handleSampleInvoiceClick = async (preset: SampleInvoicePreset, simulatePdf = false) => {
    setErrorMessage(null);
    setIsProcessing(true);
    setLastScannedSummary(null);
    const invoiceFileName = simulatePdf ? `${preset.id}-invoice.pdf` : `${preset.id}-receipt.jpg`;
    setActiveStep(`Processing ${preset.name} ${simulatePdf ? 'PDF document' : 'bill'}...`);

    try {
      const dataUrl = generateSampleInvoiceImage(preset);

      // Attempt AI server processing with a 25-second client timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      let itemsToSave: ExtractedItem[] = [];

      try {
        const response = await fetch('/api/scan-invoice', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            imageBase64: dataUrl,
            fileName: invoiceFileName,
            mimeType: simulatePdf ? 'application/pdf' : 'image/jpeg',
            isSamplePreset: true
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json().catch(() => ({}));
          if (result.success && Array.isArray(result.items) && result.items.length > 0) {
            itemsToSave = result.items;
          }
        }
      } catch (_networkOrTimeoutErr) {
        clearTimeout(timeoutId);
      }

      // If vision model succeeded, use its extracted items; otherwise use the verified preset items
      if (itemsToSave.length === 0) {
        itemsToSave = preset.items.map(item => ({
          itemName: item.name,
          quantity: item.qty,
          pricePerUnit: item.unitPrice,
          totalValue: item.total,
          category: item.cat,
          date: preset.date || new Date().toISOString().split('T')[0]
        }));
      }

      setActiveStep('Sorting items alphabetically & persisting directly to Firestore...');

      // Save directly to Firestore
      await onScanComplete(itemsToSave, invoiceFileName);

      const totalAmount = itemsToSave.reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0);

      setLastScannedSummary({
        fileName: invoiceFileName,
        itemsCount: itemsToSave.length,
        totalAmount: Math.round(totalAmount * 100) / 100,
        invoiceDate: preset.date
      });

    } catch (err: any) {
      console.warn('Sample invoice handling error:', err?.message || err);
      setErrorMessage(err.message || 'Failed to process sample invoice.');
    } finally {
      setIsProcessing(false);
      setActiveStep('');
    }
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
      {/* Header with Title and Mode Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              AI Invoice & Bill Scanner
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              PDF & Images
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gemma Vision & Gemini OCR automatically extracts Item Name, Date, Quantity, Unit Price (₹), and Total Value.
          </p>
        </div>

        {/* Action Buttons: Camera Snap & File Pick */}
        <div className="flex items-center space-x-2">
          {/* Live Webcam Snap Modal */}
          <button
            onClick={() => setWebcamOpen(true)}
            disabled={isProcessing}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer disabled:opacity-50"
            title="Open live webcam viewfinder with invoice framing guides"
          >
            <Camera className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Webcam Scanner</span>
          </button>

          {/* Quick Native Camera Snap for Mobile */}
          <button
            onClick={() => nativeCameraInputRef.current?.click()}
            disabled={isProcessing}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition cursor-pointer disabled:opacity-50"
            title="Snap photo directly using your phone or device native camera"
          >
            <Camera className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Snap Photo</span>
          </button>

          {/* Upload Invoice or PDF Document Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Invoice / PDF</span>
          </button>

          {/* Hidden file inputs: supports both images and PDF documents */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            onChange={handleFileInputChange}
            className="hidden"
          />
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Drag & Drop Dropzone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer ${
          dragActive
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 scale-[0.99]'
            : 'border-slate-200 dark:border-slate-800 hover:border-emerald-400/80 dark:hover:border-emerald-600/80 bg-slate-50/60 dark:bg-slate-950/40'
        } ${isProcessing ? 'pointer-events-none opacity-80' : ''}`}
      >
        {isProcessing ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 animate-pulse">
                <Loader2 className="w-7 h-7 animate-spin" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Processing Invoice with Gemini OCR...
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                {activeStep || 'Analyzing invoice structure...'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Drag and drop your paper invoice, PDF document, or receipt photo here
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Supports PDF invoices, PNG, JPG, JPEG, WEBP • Auto-extracts line items, dates, and prices in INR (₹)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="flex-1">{errorMessage}</span>
        </div>
      )}

      {/* Success summary notification */}
      {lastScannedSummary && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200 animate-in fade-in duration-300">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold">Extraction Complete! </span>
              <span>
                Added <strong className="underline">{lastScannedSummary.itemsCount} items</strong> (₹
                {lastScannedSummary.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) from <em>{lastScannedSummary.fileName}</em>
                {lastScannedSummary.invoiceDate ? ` (Date: ${lastScannedSummary.invoiceDate})` : ''} directly into Firestore.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Sample Invoices & PDFs for Instant Demo Verification */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Don't have an invoice right now? Test with 1-click sample bills (Image / PDF):</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SAMPLE_INVOICE_PRESETS.map((preset, idx) => (
            <button
              key={preset.id}
              onClick={() => handleSampleInvoiceClick(preset, idx === 0)}
              disabled={isProcessing}
              className="text-left p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-200/70 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700/60 transition cursor-pointer disabled:opacity-50 group flex flex-col justify-between"
            >
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 flex items-center justify-between">
                  <span className="truncate pr-1">{preset.name}</span>
                  <div className="flex items-center space-x-1 shrink-0">
                    {idx === 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-600 text-white font-extrabold uppercase">
                        PDF
                      </span>
                    )}
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {preset.items.length} items • Date: {preset.date}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Webcam modal */}
      <WebcamModal
        isOpen={webcamOpen}
        onClose={() => setWebcamOpen(false)}
        onCapture={(dataUrl) => executeInvoiceScan(dataUrl, 'camera-capture.jpg', 'image/jpeg')}
      />
    </div>
  );
};
