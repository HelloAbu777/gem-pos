'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Printer, Plus, Minus } from 'lucide-react';

interface Props {
  open:     boolean;
  onClose:  () => void;
  name:     string;
  barcode:  string;
  price:    number;
}

const fmt = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n));

export default function BarcodePrintModal({ open, onClose, name, barcode, price }: Props) {
  const [qty,       setQty]       = useState(1);
  const [printing,  setPrinting]  = useState(false);
  const previewRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setQty(1);
  }, [open]);

  const handlePrint = () => {
    if (!barcode) return;
    setPrinting(true);

    // Bir label uchun HTML
    const labelHtml = `
      <div style="
        width:200px;border:1px solid #ccc;padding:8px 12px;
        text-align:center;font-family:Arial,sans-serif;
        page-break-inside:avoid;margin-bottom:4px;display:inline-block;
      ">
        <div style="font-size:11px;font-weight:bold;margin-bottom:5px;
          word-break:break-word;line-height:1.3;">${name}</div>
        <svg id="barcode-${Math.random().toString(36).slice(2)}"
          style="width:100%;height:45px;display:block;"></svg>
        <div style="font-size:9px;letter-spacing:1.5px;margin:3px 0;font-family:monospace;">${barcode}</div>
        <div style="font-size:12px;font-weight:bold;margin-top:4px;">${fmt(price)} so'm</div>
      </div>`;

    // n dona label
    const allLabels = Array.from({ length: qty }).map(() => labelHtml).join('');

    const win = window.open('', '_blank', 'width=700,height=500');
    if (!win) { setPrinting(false); return; }

    // JsBarcode CDN dan barcode chizamiz
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Barcode — ${name}</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"><\/script>
      <style>
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#fff; padding:10px; }
        @media print {
          body { padding:0; }
          @page { margin:5mm; }
        }
        .labels { display:flex; flex-wrap:wrap; gap:4px; }
      </style>
    </head><body>
      <div class="labels">
        ${Array.from({ length: qty }).map((_, i) => `
          <div style="width:200px;border:1px solid #ccc;padding:8px 12px;
            text-align:center;font-family:Arial,sans-serif;display:inline-block;">
            <div style="font-size:11px;font-weight:bold;margin-bottom:5px;
              word-break:break-word;line-height:1.3;">${name}</div>
            <svg id="bc_${i}" style="width:100%;max-height:50px;"></svg>
            <div style="font-size:9px;letter-spacing:1.5px;margin:3px 0;font-family:monospace;">${barcode}</div>
            <div style="font-size:12px;font-weight:bold;margin-top:4px;">${fmt(price)} so'm</div>
          </div>`).join('')}
      </div>
      <script>
        window.onload = function() {
          try {
            for(var i = 0; i < ${qty}; i++) {
              JsBarcode('#bc_' + i, '${barcode}', {
                format: 'CODE128',
                width: 1.4,
                height: 40,
                displayValue: false,
                margin: 2,
              });
            }
          } catch(e) {
            console.error(e);
          }
          setTimeout(function() {
            window.print();
            window.close();
          }, 800);
        };
      <\/script>
    </body></html>`);
    win.document.close();
    setTimeout(() => setPrinting(false), 1200);
  };

  if (!open) return null;

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
          {/* Preview */}
          <div
            ref={previewRef}
            className="border border-dashed border-gray-300 rounded-xl p-4 bg-gray-50 flex flex-col items-center"
          >
            {/* Nom */}
            <p className="text-xs font-bold text-gray-900 text-center mb-2 max-w-[160px] leading-tight">
              {name}
            </p>
            {/* Barcode chiziqlar (CSS simulyatsiya) */}
            <div className="flex items-end gap-px mb-1" style={{ height: 40 }}>
              {Array.from({ length: barcode.length * 3 + 10 }).map((_, i) => {
                const pattern  = [3,1,2,1,3,2,1,2,1,3,2,1,3,1,2];
                const w        = pattern[i % pattern.length];
                const h        = 30 + ((i * 7) % 12);
                const isSpace  = (i % 5 === 4);
                return (
                  <div key={i}
                    style={{
                      width:      `${isSpace ? 2 : w}px`,
                      height:     `${h}px`,
                      background: isSpace ? 'transparent' : '#111',
                      flexShrink: 0,
                    }}
                  />
                );
              })}
            </div>
            {/* Barcode raqami */}
            <p className="text-xs font-mono text-gray-800 tracking-widest mt-0.5">{barcode}</p>
            {/* Narx */}
            <p className="text-sm font-bold text-gray-900 mt-1.5">{fmt(price)} so'm</p>
          </div>

          {/* Soni tanlash */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">
              Nechta chop etish?
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <Minus className="w-4 h-4 text-gray-600" />
              </button>
              <input
                type="number"
                min={1}
                max={100}
                value={qty}
                onChange={e => setQty(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                className="flex-1 text-center text-2xl font-bold border border-gray-300 rounded-lg py-1.5 focus:ring-2 focus:ring-gray-900 outline-none"
              />
              <button
                onClick={() => setQty(q => Math.min(100, q + 1))}
                className="w-9 h-9 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <p className="text-xs text-gray-400 text-center mt-1">{qty} ta label chop etiladi</p>
          </div>

          {/* Quick qty buttons */}
          <div className="flex gap-2">
            {[1, 5, 10, 20, 50].map(n => (
              <button key={n} onClick={() => setQty(n)}
                className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${
                  qty === n
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
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
