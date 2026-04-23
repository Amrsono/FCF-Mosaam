import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Normalizes dataset to have matching columns for exporting
 */
const prepareData = (data, headers) => {
  return data.map(item => {
    const row = {};
    headers.forEach(h => {
      // Allow accessor to be a string key or a functional accessor
      const val = typeof h.accessor === 'function' ? h.accessor(item) : item[h.accessor];
      row[h.label] = val != null ? String(val) : '';
    });
    return row;
  });
};

export const exportToExcel = (data, headers, filename) => {
  const preparedData = prepareData(data, headers);
  const worksheet = XLSX.utils.json_to_sheet(preparedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// ── Arabic Font Support ──────────────────────────────────────────────
// jsPDF's built-in fonts (Helvetica, Times, Courier) do NOT support
// Arabic/Unicode glyphs. We dynamically fetch the Amiri TTF font from
// Google Fonts CDN on first use and cache it for subsequent exports.
let _fontCache = null;
let _fontPromise = null;

const loadArabicFont = async () => {
  if (_fontCache) return _fontCache;
  if (_fontPromise) return _fontPromise;

  _fontPromise = (async () => {
    try {
      const res = await fetch(
        'https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrIw74NL.ttf'
      );
      if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
      const buffer = await res.arrayBuffer();
      const bytes = new Uint8Array(buffer);

      // Convert ArrayBuffer → base64 in chunks to avoid call-stack limits
      let binary = '';
      const CHUNK = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
      }
      _fontCache = btoa(binary);
      return _fontCache;
    } catch (err) {
      console.warn('Could not load Arabic font for PDF:', err);
      return null;
    } finally {
      _fontPromise = null;
    }
  })();

  return _fontPromise;
};

/**
 * Safely convert any value to a printable string for PDF cells
 */
const safeString = (val) => {
  if (val == null) return '';
  if (typeof val === 'object') {
    // Handle Date objects
    if (val instanceof Date) return val.toLocaleString();
    return JSON.stringify(val);
  }
  return String(val);
};

export const exportToPDF = async (data, headers, filename, title) => {
  try {
    const doc = new jsPDF();

    // ── Register Arabic font ───────────────────────────────────────
    const fontBase64 = await loadArabicFont();
    let fontName;
    if (fontBase64) {
      doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
      doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
      doc.setFont('Amiri');
      fontName = 'Amiri';
    }

    // ── Title ──────────────────────────────────────────────────────
    if (title) {
      doc.setFontSize(18);
      doc.text(safeString(title), 14, 22);
    }

    // ── Table data ─────────────────────────────────────────────────
    const tableColumn = headers.map(h => safeString(h.label));
    const tableRows = data.map(item =>
      headers.map(h => {
        try {
          const raw = typeof h.accessor === 'function'
            ? h.accessor(item)
            : item[h.accessor];
          return safeString(raw);
        } catch {
          return '';
        }
      })
    );

    const fontStyles = fontName ? { font: fontName } : {};

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: title ? 30 : 14,
      theme: 'grid',
      headStyles: { fillColor: [80, 60, 255], ...fontStyles },
      styles: { ...fontStyles, cellPadding: 3, fontSize: 9 },
    });

    doc.save(`${filename}.pdf`);
  } catch (error) {
    console.error('PDF export failed:', error);
    alert('PDF export failed: ' + (error.message || 'Unknown error'));
  }
};
