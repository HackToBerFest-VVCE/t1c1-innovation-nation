/**
 * Generates realistic paper invoice / receipt canvas images for instant 1-click AI scanning tests.
 * Formatted with Indian Rupees (INR - ₹).
 */

export interface SampleInvoicePreset {
  id: string;
  name: string;
  storeName: string;
  invoiceNo: string;
  date: string;
  items: Array<{ name: string; qty: number; unitPrice: number; total: number; cat: string }>;
}

export const SAMPLE_INVOICE_PRESETS: SampleInvoicePreset[] = [
  {
    id: 'eco-grocer',
    name: 'Fresh Harvest Organic Wholesale (₹)',
    storeName: 'FRESH HARVEST DISTRIBUTORS PVT LTD',
    invoiceNo: 'INV-2026-8841',
    date: '2026-10-26',
    items: [
      { name: 'Organic Shimla Apples (kg)', qty: 15, unitPrice: 180.00, total: 2700.00, cat: 'Produce' },
      { name: 'Hass Avocados (Pack of 2)', qty: 20, unitPrice: 220.00, total: 4400.00, cat: 'Produce' },
      { name: 'Oat Milk Barista Edition 1L', qty: 18, unitPrice: 280.00, total: 5040.00, cat: 'Dairy & Plant Milk' },
      { name: 'Free-Range Organic Eggs (12pk)', qty: 12, unitPrice: 160.00, total: 1920.00, cat: 'Dairy & Eggs' },
      { name: 'Artisan Sourdough Country Loaf', qty: 8, unitPrice: 240.00, total: 1920.00, cat: 'Bakery' },
      { name: 'Fair Trade Coorg Roast Coffee (250g)', qty: 10, unitPrice: 420.00, total: 4200.00, cat: 'Beverages' },
      { name: 'Hydroponic Baby Spinach (250g)', qty: 4, unitPrice: 95.00, total: 380.00, cat: 'Produce' },
    ]
  },
  {
    id: 'eco-market',
    name: 'BioEarth Eco Supplies Wholesale (₹)',
    storeName: 'BIO-EARTH ZERO WASTE SUPPLIES',
    invoiceNo: 'INV-2026-9042',
    date: '2026-10-25',
    items: [
      { name: 'Bamboo Toothbrush Adult (4pk)', qty: 25, unitPrice: 199.00, total: 4975.00, cat: 'Personal Care' },
      { name: 'Organic Neem & Lavender Hand Wash 500ml', qty: 16, unitPrice: 275.00, total: 4400.00, cat: 'Personal Care' },
      { name: 'Unbleached Recycled Kitchen Towels (4pk)', qty: 9, unitPrice: 320.00, total: 2880.00, cat: 'Eco Household' },
      { name: 'Pure Beeswax Food Wraps (Set of 3)', qty: 14, unitPrice: 450.00, total: 6300.00, cat: 'Eco Household' },
      { name: 'Raw Himalayan Forest Honey 500g', qty: 3, unitPrice: 550.00, total: 1650.00, cat: 'Pantry' },
    ]
  },
  {
    id: 'artisan-pantry',
    name: 'Nilgiri Roasters & Artisan Pantry (₹)',
    storeName: 'NILGIRI ROASTERS & SPECIALTY PANTRY',
    invoiceNo: 'INV-2026-7219',
    date: '2026-10-26',
    items: [
      { name: 'Single Origin Arabica Beans (1kg)', qty: 12, unitPrice: 1450.00, total: 17400.00, cat: 'Beverages' },
      { name: 'Ceremonial Grade Green Tea Powder 100g', qty: 6, unitPrice: 850.00, total: 5100.00, cat: 'Beverages' },
      { name: 'Organic Almond Butter Creamy 350g', qty: 10, unitPrice: 495.00, total: 4950.00, cat: 'Pantry' },
      { name: 'Gluten-Free Millet Crackers 200g', qty: 20, unitPrice: 160.00, total: 3200.00, cat: 'Snacks' },
      { name: 'Kerala Dark Cocoa Drops 70% 500g', qty: 4, unitPrice: 620.00, total: 2480.00, cat: 'Snacks' },
    ]
  }
];

/**
 * Draws a realistic receipt paper image onto a hidden canvas and returns base64 JPEG.
 */
export function generateSampleInvoiceImage(preset: SampleInvoicePreset): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 840;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background - textured warm receipt paper
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle paper borders & folds
  ctx.strokeStyle = '#e2ded5';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // Store Header
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 19px "Courier New", Courier, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(preset.storeName, canvas.width / 2, 55);

  ctx.font = '13px "Courier New", Courier, monospace';
  ctx.fillStyle = '#475569';
  ctx.fillText('MG ROAD, COMMERCIAL SECTOR 4, BENGALURU', canvas.width / 2, 75);
  ctx.fillText('GSTIN: 29AAAAA0000A1Z5  •  TEL: 080-2849102', canvas.width / 2, 92);

  // Dashed divider
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#cbd5e1';
  ctx.beginPath();
  ctx.moveTo(30, 110);
  ctx.lineTo(canvas.width - 30, 110);
  ctx.stroke();
  ctx.setLineDash([]);

  // Invoice Details
  ctx.textAlign = 'left';
  ctx.font = '13px "Courier New", Courier, monospace';
  ctx.fillStyle = '#334155';
  ctx.fillText(`INVOICE: ${preset.invoiceNo}`, 35, 135);
  ctx.fillText(`DATE: ${preset.date} 10:30 AM`, 35, 155);
  ctx.fillText(`CUSTOMER: EcoRetail Storefront Bangalore`, 35, 175);
  ctx.fillText(`PAYMENT: UPI / RECEIVED IN FULL (INR)`, 35, 195);

  // Table Header
  ctx.beginPath();
  ctx.moveTo(30, 215);
  ctx.lineTo(canvas.width - 30, 215);
  ctx.stroke();

  ctx.font = 'bold 13px "Courier New", Courier, monospace';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('DESCRIPTION', 35, 232);
  ctx.fillText('QTY', 335, 232);
  ctx.fillText('PRICE (₹)', 410, 232);
  ctx.fillText('TOTAL (₹)', 500, 232);

  ctx.beginPath();
  ctx.moveTo(30, 245);
  ctx.lineTo(canvas.width - 30, 245);
  ctx.stroke();

  // Line items
  let y = 270;
  let subtotal = 0;
  ctx.font = '12px "Courier New", Courier, monospace';
  ctx.fillStyle = '#1e293b';

  preset.items.forEach(item => {
    subtotal += item.total;
    // Item name
    ctx.textAlign = 'left';
    const truncatedName = item.name.length > 28 ? item.name.slice(0, 26) + '..' : item.name;
    ctx.fillText(truncatedName, 35, y);

    // Qty
    ctx.textAlign = 'center';
    ctx.fillText(`${item.qty}`, 350, y);

    // Price
    ctx.textAlign = 'right';
    ctx.fillText(`Rs.${item.unitPrice.toFixed(2)}`, 470, y);

    // Total
    ctx.fillText(`Rs.${item.total.toFixed(2)}`, 555, y);

    y += 28;
  });

  // Summary box
  y = Math.max(y + 20, 580);
  ctx.beginPath();
  ctx.moveTo(30, y);
  ctx.lineTo(canvas.width - 30, y);
  ctx.stroke();

  y += 25;
  ctx.textAlign = 'right';
  ctx.font = '13px "Courier New", Courier, monospace';
  ctx.fillText(`SUBTOTAL: Rs. ${subtotal.toFixed(2)}`, 555, y);

  y += 22;
  const gst = subtotal * 0.05;
  ctx.fillText(`GST (5.00%): Rs. ${gst.toFixed(2)}`, 555, y);

  y += 26;
  ctx.font = 'bold 15px "Courier New", Courier, monospace';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`TOTAL: Rs. ${(subtotal + gst).toFixed(2)}`, 555, y);

  // Footer barcode simulation
  y += 45;
  ctx.textAlign = 'center';
  ctx.font = '11px "Courier New", Courier, monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('THANK YOU FOR SUPPORTING SUSTAINABLE RETAIL', canvas.width / 2, y);

  y += 25;
  // Draw simulated barcode lines
  const barcodeX = 140;
  const barcodeWidth = 320;
  ctx.fillStyle = '#1e293b';
  for (let b = 0; b < barcodeWidth; b += 4) {
    if (Math.sin(b * 3.7) > -0.2) {
      const lineThickness = (b % 6 === 0) ? 3 : 1.5;
      ctx.fillRect(barcodeX + b, y, lineThickness, 40);
    }
  }

  ctx.font = '11px "Courier New", Courier, monospace';
  ctx.fillText(`*${preset.invoiceNo.replace(/[^0-9]/g, '')}*`, canvas.width / 2, y + 55);

  return canvas.toDataURL('image/jpeg', 0.92);
}
