import { GoogleGenAI, Type } from '@google/genai';
import type { IncomingMessage, ServerResponse } from 'http';

function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

// Preset fallbacks ONLY for built-in 1-click sample demo receipts
const PRESET_FALLBACKS: Record<string, Array<{ itemName: string; quantity: number; pricePerUnit: number; totalValue: number; category: string; date: string }>> = {
  'eco-grocer': [
    { itemName: 'Organic Shimla Apples (kg)', quantity: 15, pricePerUnit: 180.00, totalValue: 2700.00, category: 'Produce', date: '2026-10-26' },
    { itemName: 'Hass Avocados (Pack of 2)', quantity: 20, pricePerUnit: 220.00, totalValue: 4400.00, category: 'Produce', date: '2026-10-26' },
    { itemName: 'Oat Milk Barista Edition 1L', quantity: 18, pricePerUnit: 280.00, totalValue: 5040.00, category: 'Dairy & Plant Milk', date: '2026-10-26' },
    { itemName: 'Free-Range Organic Eggs (12pk)', quantity: 12, pricePerUnit: 160.00, totalValue: 1920.00, category: 'Dairy & Eggs', date: '2026-10-26' },
    { itemName: 'Artisan Sourdough Country Loaf', quantity: 8, pricePerUnit: 240.00, totalValue: 1920.00, category: 'Bakery', date: '2026-10-26' },
    { itemName: 'Fair Trade Coorg Roast Coffee (250g)', quantity: 10, pricePerUnit: 420.00, totalValue: 4200.00, category: 'Beverages', date: '2026-10-26' },
    { itemName: 'Hydroponic Baby Spinach (250g)', quantity: 4, pricePerUnit: 95.00, totalValue: 380.00, category: 'Produce', date: '2026-10-26' },
  ],
  'eco-market': [
    { itemName: 'Bamboo Toothbrush Adult (4pk)', quantity: 25, pricePerUnit: 199.00, totalValue: 4975.00, category: 'Personal Care', date: '2026-10-25' },
    { itemName: 'Organic Neem & Lavender Hand Wash 500ml', quantity: 16, pricePerUnit: 275.00, totalValue: 4400.00, category: 'Personal Care', date: '2026-10-25' },
    { itemName: 'Unbleached Recycled Kitchen Towels (4pk)', quantity: 9, pricePerUnit: 320.00, totalValue: 2880.00, category: 'Eco Household', date: '2026-10-25' },
    { itemName: 'Pure Beeswax Food Wraps (Set of 3)', quantity: 14, pricePerUnit: 450.00, totalValue: 6300.00, category: 'Eco Household', date: '2026-10-25' },
    { itemName: 'Raw Himalayan Forest Honey 500g', quantity: 3, pricePerUnit: 550.00, totalValue: 1650.00, category: 'Pantry', date: '2026-10-25' },
  ],
  'artisan-pantry': [
    { itemName: 'Single Origin Arabica Beans (1kg)', quantity: 12, pricePerUnit: 1450.00, totalValue: 17400.00, category: 'Beverages', date: '2026-10-26' },
    { itemName: 'Ceremonial Grade Green Tea Powder 100g', quantity: 6, pricePerUnit: 850.00, totalValue: 5100.00, category: 'Beverages', date: '2026-10-26' },
    { itemName: 'Organic Almond Butter Creamy 350g', quantity: 10, pricePerUnit: 495.00, totalValue: 4950.00, category: 'Pantry', date: '2026-10-26' },
    { itemName: 'Gluten-Free Millet Crackers 200g', quantity: 20, pricePerUnit: 160.00, totalValue: 3200.00, category: 'Snacks', date: '2026-10-26' },
    { itemName: 'Kerala Dark Cocoa Drops 70% 500g', quantity: 4, pricePerUnit: 620.00, totalValue: 2480.00, category: 'Snacks', date: '2026-10-26' },
  ],
};

function isPresetSample(fileName: string, isSamplePreset?: boolean): boolean {
  if (isSamplePreset) return true;
  const lower = (fileName || '').toLowerCase();
  return lower.includes('eco-grocer') || lower.includes('eco-market') || lower.includes('artisan-pantry');
}

function getFallbackItems(fileName: string) {
  const lower = (fileName || '').toLowerCase();
  if (lower.includes('eco-grocer')) return PRESET_FALLBACKS['eco-grocer'];
  if (lower.includes('eco-market')) return PRESET_FALLBACKS['eco-market'];
  if (lower.includes('artisan-pantry')) return PRESET_FALLBACKS['artisan-pantry'];
  return PRESET_FALLBACKS['eco-grocer'];
}

export function handleScanInvoice(req: IncomingMessage, res: ServerResponse): Promise<void> {
  return new Promise<void>((resolve) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      resolve();
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      resolve();
      return;
    }

    const processPayload = async (data: any) => {
      const { imageBase64, mimeType = 'image/jpeg', fileName = 'invoice.jpg', isSamplePreset = false } = data || {};

      if (!imageBase64) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'No invoice image or PDF data provided' }));
        resolve();
        return;
      }

      // Check whether this is a PDF document or an image
      const isPdf = (fileName && fileName.toLowerCase().endsWith('.pdf')) ||
        (mimeType && mimeType.includes('pdf')) ||
        (typeof imageBase64 === 'string' && imageBase64.startsWith('data:application/pdf'));

      // Strip data URI header prefix if present
      const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      let cleanMimeType = isPdf ? 'application/pdf' : mimeType;
      if (imageBase64.includes(',')) {
        const headerMatch = imageBase64.match(/data:([^;]+);/);
        if (headerMatch && headerMatch[1]) {
          cleanMimeType = headerMatch[1];
        }
      }
      if (isPdf && !cleanMimeType.includes('pdf')) {
        cleanMimeType = 'application/pdf';
      }

      const todayStr = new Date().toISOString().split('T')[0];
      const isPreset = isPresetSample(fileName, isSamplePreset);

      const apiKey = getApiKey();
      if (!apiKey) {
        if (isPreset) {
          const fallbackItems = getFallbackItems(fileName).sort((a, b) => a.itemName.localeCompare(b.itemName));
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            items: fallbackItems,
            invoiceDate: todayStr,
            fileName,
            modelUsed: 'sample-preset'
          }));
          resolve();
          return;
        } else {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'GEMINI_API_KEY is not configured on the server.' }));
          resolve();
          return;
        }
      }

      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
            timeout: 30000
          }
        });

        const promptText = `You are an expert optical OCR retail bill and invoice parser for EcoRetail.
Carefully inspect this invoice document (photo, paper bill, receipt, or PDF) and transcribe ALL purchased stock and inventory line items with high precision.

CRITICAL PARSING RULES:
1. EXACT ITEM NAMES:
   - Transcribe the exact item name/description as printed on the document (e.g. "Parker Vector Rollerball Pen", "Casio FX-991CW Calculator", "Organic Whole Wheat Atta 5kg").
   - Do NOT invent, assume, simplify, or substitute placeholder products.
   - Do NOT omit items that appear in the table.

2. COLUMNS & ALIGNMENT:
   - Serial Number (#, S.No, 1, 2, 3...): Do NOT confuse with Quantity!
   - HSN/SAC Code or SKU: Do NOT confuse with Item Name or Quantity!
   - Quantity: The exact count or units purchased (number, integer >= 1).
   - Price Per Unit (pricePerUnit): Unit price or rate in INR (₹). If only total is shown, calculate total / quantity.
   - Total Value (totalValue): The total amount for this specific line item in INR (₹).

3. NON-INVENTORY EXCLUSIONS:
   - Do NOT extract totals or summary rows as items (Subtotal, Tax, CGST, SGST, IGST, VAT, Round Off, Grand Total, Net Amount, Discount totals).
   - Do NOT extract merchant/store name, cashier name, customer name, GSTIN, or payment terms as items.

4. DATE:
   - Extract the invoice date from the bill header (e.g., "Date:", "Invoice Date:", "Dated:"). Format strictly as YYYY-MM-DD.
   - If no date is found or legible, use "${todayStr}".

5. CATEGORY:
   - Assign an appropriate retail category (e.g., Produce, Groceries & Food, Dairy & Plant Milk, Beverages, Bakery, Pantry, Snacks, Stationery, Electronics, Hardware & Electrical, Personal Care, Eco Household, Clothing, General).

Strictly output a JSON array of objects conforming to the schema.`;

        // Model selection: try gemini-3.1-flash-lite first for lightning-fast OCR (under 3s), fallback to gemini-flash-latest
        const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-latest'];
        let rawText = '';
        let modelUsed = '';
        let lastError: any = null;

        for (const candidate of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model: candidate,
              contents: {
                parts: [
                  {
                    inlineData: {
                      mimeType: cleanMimeType,
                      data: cleanBase64,
                    },
                  },
                  { text: promptText }
                ]
              },
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.ARRAY,
                  description: 'List of inventory items extracted from invoice',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      itemName: { type: Type.STRING, description: 'Product or item title transcribed verbatim' },
                      quantity: { type: Type.NUMBER, description: 'Quantity count' },
                      pricePerUnit: { type: Type.NUMBER, description: 'Price per individual unit in INR' },
                      totalValue: { type: Type.NUMBER, description: 'Total value of item line in INR' },
                      category: { type: Type.STRING, description: 'Store department/category' },
                      date: { type: Type.STRING, description: 'Invoice or purchase date formatted as YYYY-MM-DD' }
                    },
                    required: ['itemName', 'quantity', 'pricePerUnit', 'totalValue', 'date']
                  }
                }
              }
            });

            if (response.text) {
              rawText = response.text.trim();
              modelUsed = candidate;
              break;
            }
          } catch (modelErr: any) {
            console.warn(`Vision model ${candidate} failed:`, modelErr?.message || modelErr);
            lastError = modelErr;
          }
        }

        if (!rawText) {
          throw lastError || new Error('All vision models failed to process this document');
        }

        let extractedItems: any[] = [];
        try {
          extractedItems = JSON.parse(rawText);
        } catch (parseErr) {
          console.error('Failed to parse model JSON:', rawText);
          extractedItems = [];
        }

        if (!Array.isArray(extractedItems) || extractedItems.length === 0) {
          throw new Error('No items detected by vision model in this invoice. Please ensure the document is clear and contains readable line items.');
        }

        // Clean & ensure schema conformity
        const cleanedItems = extractedItems
          .map(item => {
            let itemDate = todayStr;
            if (item.date && typeof item.date === 'string') {
              const trimmed = item.date.trim();
              if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                itemDate = trimmed;
              } else {
                const parsed = new Date(trimmed);
                if (!isNaN(parsed.getTime())) {
                  itemDate = parsed.toISOString().split('T')[0];
                }
              }
            }

            const rawQty = Math.max(1, Math.round(Number(item.quantity) || 1));
            const rawUnit = Math.max(0, Math.round((Number(item.pricePerUnit) || 0) * 100) / 100);
            const rawTotal = Math.max(0, Math.round((Number(item.totalValue) || (rawQty * rawUnit)) * 100) / 100);

            return {
              itemName: String(item.itemName || 'Unnamed Item').trim().slice(0, 150),
              quantity: rawQty,
              pricePerUnit: rawUnit,
              totalValue: rawTotal,
              category: String(item.category || 'General').trim().slice(0, 60),
              date: itemDate,
            };
          })
          // Automatically sort extracted items alphabetically by Item Name as requested
          .sort((a, b) => a.itemName.localeCompare(b.itemName, undefined, { sensitivity: 'base' }));

        const invoiceDate = cleanedItems[0]?.date || todayStr;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: true,
          items: cleanedItems,
          invoiceDate,
          fileName,
          isPdf,
          count: cleanedItems.length,
          modelUsed
        }));
        resolve();

      } catch (err: any) {
        console.error('Invoice scanning error on server:', err?.message || err);

        // If this is an explicit built-in sample preset and upstream failed, use the verified preset items
        if (isPreset) {
          const fallbackItems = getFallbackItems(fileName).map(i => ({
            ...i,
            date: i.date || todayStr
          })).sort((a, b) => a.itemName.localeCompare(b.itemName));

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            success: true,
            items: fallbackItems,
            invoiceDate: fallbackItems[0]?.date || todayStr,
            fileName,
            isPdf,
            count: fallbackItems.length,
            modelUsed: 'sample-preset-recovery'
          }));
          resolve();
          return;
        }

        // For REAL user uploads: DO NOT substitute fake apples! Return a clear, actionable error
        res.statusCode = 422;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          success: false,
          error: `Could not parse items from "${fileName}": ${err?.message || 'Vision model error'}. Please ensure the invoice is clear and readable.`,
          fileName
        }));
        resolve();
      }
    };

    // If body was already parsed by an upstream middleware (e.g., Express)
    if ((req as any).body && typeof (req as any).body === 'object') {
      processPayload((req as any).body);
      return;
    }

    // Otherwise, stream chunks directly from raw request
    const chunks: Buffer[] = [];
    req.on('data', chunk => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });

    req.on('error', (err) => {
      console.error('Request stream error:', err);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Failed to read request stream' }));
      resolve();
    });

    req.on('end', async () => {
      const bodyBuffer = Buffer.concat(chunks);
      const body = bodyBuffer.toString('utf8');
      let data: any = {};
      try {
        data = JSON.parse(body || '{}');
      } catch (jsonErr) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
        resolve();
        return;
      }
      processPayload(data);
    });
  });
}
