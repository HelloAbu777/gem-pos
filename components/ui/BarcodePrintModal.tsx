'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Printer, Plus, Minus } from 'lucide-react';

interface Props {
  open:    boolean;
  onClose: () => void;
  name:    string;
  barcode: string;
  price:   number;
}

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

/* ─────────────────────────────────────────────────────────────
   CODE128-B encoder — CDN talab qilmaydi
   Returns array of 0/1 bits (bar=1, space=0)
───────────────────────────────────────────────────────────── */
const CODE128_TABLE: Record<number, number[]> = {
  0: [1,1,0,1,1,0,0,1,1,0,1,1],   1: [1,1,0,1,1,0,1,1,0,0,1,1],
  2: [1,1,0,0,1,1,0,1,1,0,1,1],   3: [1,0,0,1,0,0,1,1,0,0,1,1],
  4: [1,0,0,1,1,0,0,1,0,0,1,1],   5: [1,0,0,1,1,0,1,1,0,0,1,0],
  6: [1,0,0,0,1,0,1,1,0,0,1,1],   7: [1,0,0,1,0,0,1,1,0,1,1,0],
  8: [1,0,0,1,0,0,0,1,0,0,1,1],   9: [1,1,0,0,1,0,0,1,0,0,1,1],
  10: [1,1,0,0,1,0,1,1,0,0,1,0],  11: [1,1,0,0,1,0,1,1,0,1,0,0],
  12: [1,0,0,1,1,0,1,0,0,0,1,1],  13: [1,0,0,1,1,0,0,1,0,1,1,0],
  14: [1,0,0,1,1,0,1,1,0,1,0,0],  15: [1,0,0,1,1,0,0,0,1,0,1,1],
  16: [1,0,0,0,1,1,0,1,0,0,1,1],  17: [1,0,1,1,0,0,1,0,0,1,1,0],
  18: [1,0,1,1,0,0,1,1,0,1,0,0],  19: [1,1,0,0,0,1,0,1,0,0,1,1],
  20: [1,1,0,0,1,1,0,1,0,0,1,0],  21: [1,1,0,0,1,0,0,1,1,0,1,0],
  22: [1,1,0,0,0,1,0,1,1,0,1,0],  23: [1,0,0,1,0,0,1,0,1,1,0,0],
  24: [1,0,0,0,1,1,0,1,1,0,1,0],  25: [1,0,0,1,0,1,1,1,0,0,1,0],
  26: [1,0,0,1,0,0,1,1,1,0,1,0],  27: [1,0,0,1,0,1,0,0,1,1,1,0],
  28: [1,1,0,1,0,0,1,1,1,0,1,0],  29: [1,0,0,1,1,1,0,0,1,0,1,0],
  30: [1,1,0,0,1,0,1,0,0,1,1,0],  31: [1,0,1,1,0,1,1,0,0,0,1,0],
  32: [1,0,1,1,0,0,0,1,1,0,1,0],  33: [1,0,0,1,1,0,0,0,1,1,0,1],
  34: [1,0,1,1,0,1,0,0,0,1,1,0],  35: [1,0,0,1,1,1,0,1,0,0,1,0],
  36: [1,0,0,0,1,1,0,0,1,0,1,1],  37: [1,0,0,0,1,0,1,1,1,0,1,0],
  38: [1,1,0,1,0,0,0,1,1,0,1,0],  39: [1,0,0,1,0,1,1,0,1,1,1,0],
  40: [1,0,0,1,0,1,1,1,0,1,1,0],  41: [1,1,0,1,0,1,0,0,0,1,1,0],
  42: [1,1,0,1,0,0,0,1,0,1,1,0],  43: [1,0,0,1,0,1,0,0,0,1,1,1],
  44: [1,0,1,1,1,0,1,0,1,1,0,0],  45: [1,0,0,0,1,0,0,1,0,1,1,1],
  46: [1,1,1,0,1,0,0,1,0,0,1,0],  47: [1,1,0,1,0,0,0,1,0,0,1,1],
  48: [1,0,1,0,0,1,1,0,0,0,1,1],  49: [1,0,1,0,0,1,1,1,0,0,1,0],
  50: [1,0,1,0,0,0,1,1,0,0,1,1],  51: [1,0,1,0,0,1,0,0,0,1,1,1],
  52: [1,1,0,1,0,1,1,0,1,1,0,0],  53: [1,0,0,1,1,0,1,1,0,0,0,1],
  54: [1,0,0,1,0,0,0,1,1,1,0,1],  55: [1,0,0,0,1,0,1,0,0,0,1,1],
  56: [1,0,0,0,1,0,0,1,1,0,0,1],  57: [1,1,1,0,1,0,1,1,0,1,0,0],
  58: [1,1,1,0,0,1,0,0,1,0,1,0],  59: [1,0,1,1,0,0,1,1,0,0,0,1],
  60: [1,0,0,1,1,0,0,0,1,1,0,1],  61: [1,1,0,0,1,1,0,0,1,0,0,1],
  62: [1,1,0,0,1,0,0,1,1,0,0,1],  63: [1,1,0,1,1,0,1,1,0,0,0,1],
  64: [1,1,0,0,0,1,1,0,1,0,0,1],  65: [1,0,1,0,1,1,0,0,0,1,1,0],
  66: [1,0,1,0,1,1,1,0,0,1,0,0],  67: [1,0,1,0,0,0,1,1,1,0,1,0],
  68: [1,0,1,0,0,1,0,0,1,1,1,0],  69: [1,1,0,1,1,0,0,1,0,0,0,1],
  70: [1,0,0,1,1,1,0,1,1,0,0,1],  71: [1,1,0,1,0,0,1,0,0,0,1,1],
  72: [1,0,1,1,0,1,0,0,1,1,1,0],  73: [1,1,0,0,0,1,1,0,0,1,0,1],
  74: [1,1,0,0,0,1,0,0,1,1,0,1],  75: [1,0,1,0,1,1,0,1,0,0,0,1],
  76: [1,0,0,1,0,0,0,1,1,0,0,1],  77: [1,0,1,1,0,0,0,1,0,1,1,1],
  78: [1,0,1,1,0,1,0,0,0,1,0,1],  79: [1,0,0,0,1,1,1,0,0,1,0,1],
  80: [1,0,0,0,1,0,1,1,0,1,1,1],  81: [1,0,1,0,0,1,1,1,0,1,0,0],
  82: [1,0,0,0,1,1,0,1,0,1,1,1],  83: [1,0,1,1,1,0,1,1,1,0,0,1],
  84: [1,1,0,0,0,1,0,1,1,1,0,1],  85: [1,1,0,1,0,0,0,1,1,1,0,1],
  86: [1,1,0,1,0,1,1,1,0,0,0,1],  87: [1,1,0,0,1,1,1,0,1,0,0,1],
  88: [1,1,1,0,0,1,1,0,1,0,0,1],  89: [1,1,1,0,0,1,0,0,1,1,0,1],
  90: [1,1,1,0,0,1,0,1,1,0,0,1],  91: [1,1,0,1,1,0,0,0,0,1,0,1],
  92: [1,1,0,0,0,0,1,0,1,1,0,1],  93: [1,1,1,0,1,0,0,0,1,1,0,1],
  94: [1,1,0,1,1,1,0,0,0,1,0,1],  95: [1,1,0,1,0,1,0,0,1,1,1,0],
  96: [1,1,1,0,1,0,1,0,0,1,1,0],  97: [1,0,1,0,0,1,1,1,1,0,0,1],
  98: [1,0,1,0,0,0,0,1,1,0,1,1],  99: [1,1,1,0,1,0,1,1,0,0,1,0],
  100:[1,0,0,0,1,0,0,0,0,1,1,1],  101:[1,0,0,1,1,1,1,0,0,0,1,0],
  102:[1,1,0,0,0,0,1,1,0,1,1,0],  103:[1,1,0,1,0,0,1,0,0,1,1,1],// START B
  104:[1,1,0,1,0,1,0,0,1,1,0,1],  105:[1,1,0,1,1,0,1,0,0,1,0,1],
  106:[1,1,0,0,1,1,0,1,1,0,1,0,0,1,1], // STOP
};
const START_B = 104;
const STOP    = [1,1,0,0,1,1,0,1,1,0,1,0,0,1,1];

function encode128(text: string): number[] {
  const bits: number[] = [];
  // START B
  bits.push(...(CODE128_TABLE[START_B] ?? []));
  let checksum = START_B;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32; // CODE128-B offset
    const pattern = CODE128_TABLE[code] ?? CODE128_TABLE[0]!;
    bits.push(...pattern);
    checksum += (i + 1) * code;
  }
  // Checksum symbol
  const chk = checksum % 103;
  bits.push(...(CODE128_TABLE[chk] ?? []));
  // STOP
  bits.push(...STOP);
  return bits;
}

/* ─── SVG barcode renderer ─── */
function BarcodeSVG({ value, height = 50 }: { value: string; height?: number }) {
  const bits    = encode128(value);
  const barW    = 2;
  const totalW  = bits.length * barW;

  return (
    <svg
      width={totalW}
      height={height}
      viewBox={`0 0 ${totalW} ${height}`}
      style={{ display: 'block' }}
    >
      {bits.map((bit, i) =>
        bit === 1 ? (
          <rect key={i} x={i * barW} y={0} width={barW} height={height} fill="#000" />
        ) : null
      )}
    </svg>
  );
}

/* ─── Print HTML ─── */
function buildPrintHtml(name: string, barcode: string, price: number, qty: number): string {
  const bits   = encode128(barcode);
  const barW   = 1.5;
  const totalW = bits.length * barW;
  const barsHtml = bits
    .map((bit, i) =>
      bit === 1
        ? `<rect x="${(i * barW).toFixed(2)}" y="0" width="${barW}" height="40" fill="#000"/>`
        : ''
    )
    .join('');

  const label = `
    <div style="
      display:inline-block;
      width:180px;border:1px solid #ccc;padding:6px 10px;
      text-align:center;font-family:Arial,sans-serif;
      page-break-inside:avoid;margin:3px;
    ">
      <div style="font-size:10px;font-weight:bold;margin-bottom:5px;word-break:break-word;line-height:1.3;">${name}</div>
      <svg viewBox="0 0 ${totalW.toFixed(2)} 40" width="160" height="40" style="display:block;margin:0 auto;">
        ${barsHtml}
      </svg>
      <div style="font-size:8.5px;letter-spacing:1px;margin:3px 0;font-family:monospace;">${barcode}</div>
      <div style="font-size:11px;font-weight:bold;margin-top:3px;">${fmt(price)} so'm</div>
    </div>`;

  return `<!DOCTYPE html><html><head><title>Barcode</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box;}
      body{padding:8px;background:#fff;}
      .wrap{display:flex;flex-wrap:wrap;gap:4px;}
      @media print{body{padding:2mm;}@page{margin:4mm;}}
    </style></head><body>
    <div class="wrap">${Array(qty).fill(label).join('')}</div>
    <script>window.onload=function(){window.print();window.close();}<\/script>
    </body></html>`;
}

/* ─── Modal ─── */
export default function BarcodePrintModal({ open, onClose, name, barcode, price }: Props) {
  const [qty,      setQty]      = useState(1);
  const [printing, setPrinting] = useState(false);

  useEffect(() => { if (open) setQty(1); }, [open]);

  const handlePrint = () => {
    if (!barcode) return;
    setPrinting(true);
    const win = window.open('', '_blank', 'width=700,height=550');
    if (win) {
      win.document.write(buildPrintHtml(name, barcode, price, qty));
      win.document.close();
    }
    setTimeout(() => setPrinting(false), 800);
  };

  if (!open) return null;

  const previewBits = encode128(barcode || 'BARCODE');
  const barW = 1.5;
  const totalW = previewBits.length * barW;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-gray-700" />
            <h2 className="font-bold text-gray-900">Shtrix kodni chop etish</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Preview label */}
          <div className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 flex flex-col items-center">
            <p className="text-xs font-bold text-gray-900 text-center mb-2 max-w-[170px] leading-tight break-words">
              {name}
            </p>
            {/* Real barcode SVG preview */}
            {barcode ? (
              <div className="overflow-hidden" style={{ maxWidth: 170 }}>
                <svg
                  viewBox={`0 0 ${totalW.toFixed(2)} 40`}
                  width="160"
                  height="40"
                  style={{ display: 'block' }}
                >
                  {previewBits.map((bit, i) =>
                    bit === 1 ? (
                      <rect key={i} x={(i * barW).toFixed(2)} y="0" width={barW} height="40" fill="#111" />
                    ) : null
                  )}
                </svg>
              </div>
            ) : (
              <div className="w-40 h-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                Barcode yo&apos;q
              </div>
            )}
            <p className="text-xs font-mono text-gray-700 tracking-widest mt-1">{barcode}</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{fmt(price)} so&apos;m</p>
          </div>

          {/* Soni */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Nechta chop etish?
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100"
              >
                <Minus className="w-4 h-4 text-gray-600" />
              </button>
              <input
                type="number" min={1} max={100} value={qty}
                onChange={e => setQty(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                className="flex-1 text-center text-2xl font-bold border border-gray-300 rounded-lg py-1.5 focus:ring-2 focus:ring-gray-900 outline-none"
              />
              <button
                onClick={() => setQty(q => Math.min(100, q + 1))}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-1">{qty} ta label chop etiladi</p>
          </div>

          {/* Tezkor tugmalar */}
          <div className="flex gap-2">
            {[1, 5, 10, 20, 50].map(n => (
              <button key={n} onClick={() => setQty(n)}
                className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                  qty === n ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50">
            Bekor qilish
          </button>
          <button
            onClick={handlePrint}
            disabled={printing || !barcode}
            className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            {printing ? 'Chop etilmoqda...' : `${qty} ta Chop etish`}
          </button>
        </div>
      </div>
    </div>
  );
}
