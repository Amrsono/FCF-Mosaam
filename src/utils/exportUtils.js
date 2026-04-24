import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import pptxgen from "pptxgenjs";

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

    autoTable(doc, {
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

/**
 * Generates a professional master report as a PowerPoint presentation
 */
export const exportToPPTX = async (analytics, filename, language = 'en') => {
  try {
    const pptx = new pptxgen();
    
    // Set Layout
    pptx.layout = 'LAYOUT_16x9';

    // 1. TITLE SLIDE
    let slide1 = pptx.addSlide();
    slide1.background = { color: "1e1b2e" }; // Dark theme background
    
    slide1.addText("FCF MOSAAM", { 
      x: 0, y: "30%", w: "100%", align: "center", 
      fontSize: 44, bold: true, color: "7864ff" 
    });
    slide1.addText(language === 'ar' ? "تقرير التحليلات الرئيسي" : "Master Analytics Report", { 
      x: 0, y: "45%", w: "100%", align: "center", 
      fontSize: 32, color: "ffffff" 
    });
    slide1.addText(new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'full' }), { 
      x: 0, y: "60%", w: "100%", align: "center", 
      fontSize: 18, color: "a0aec0" 
    });

    // 2. JUMIA PERFORMANCE
    let slide2 = pptx.addSlide();
    slide2.addText(language === 'ar' ? "أداء J " : " J  Performance", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: "7864ff" });
    
    const jStats = [
      [language === 'ar' ? 'المؤشر' : 'Metric', language === 'ar' ? 'القيمة' : 'Value'],
      [language === 'ar' ? 'الطلبات المستلمة' : 'Orders Handled', String(analytics.jumia.pickedUpCount)],
      [language === 'ar' ? 'الإيرادات النقدي' : 'Cash Revenue', `${analytics.jumia.cash.toLocaleString()} EGP`],
      [language === 'ar' ? 'المرتجع' : 'Returns', String(analytics.jumia.returnedCount)],
      [language === 'ar' ? 'غرامات التخزين' : 'Storage Penalties', `${analytics.jumia.penalties.toLocaleString()} EGP`]
    ];
    slide2.addTable(jStats, { x: 0.5, y: 1.2, w: 9, border: { pt: 1, color: "CBD5E0" }, fill: "F7FAFC", fontSize: 14 });

    // 3. BOSTA PERFORMANCE
    let slide3 = pptx.addSlide();
    slide3.addText(language === 'ar' ? "أداء بوسطة" : "Bosta Performance", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: "6366f1" });
    const bStats = [
      [language === 'ar' ? 'المؤشر' : 'Metric', language === 'ar' ? 'القيمة' : 'Value'],
      [language === 'ar' ? 'الطلبات المستلمة' : 'Orders Handled', String(analytics.bosta.pickedUpCount)],
      [language === 'ar' ? 'الإيرادات' : 'Revenue', `${analytics.bosta.cash.toLocaleString()} EGP`],
      [language === 'ar' ? 'المرتجع' : 'Returns', String(analytics.bosta.returnedCount)]
    ];
    slide3.addTable(bStats, { x: 0.5, y: 1.2, w: 9, border: { pt: 1, color: "CBD5E0" }, fill: "F7FAFC", fontSize: 14 });

    // 4. BASATA POS ANALYTICS
    let slide4 = pptx.addSlide();
    slide4.addText(language === 'ar' ? "تحليلات بساطة POS" : "Basata POS Analytics", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: "ec4899" });
    slide4.addText(language === 'ar' ? `إجمالي الحجم: ${analytics.basata.volume.toLocaleString()} EGP` : `Total Volume: ${analytics.basata.volume.toLocaleString()} EGP`, { x: 0.5, y: 1.0, fontSize: 16 });
    
    if (analytics.basata.categoryData.length > 0) {
      const basataRows = [[language === 'ar' ? 'الفئة' : 'Category', language === 'ar' ? 'المبلغ' : 'Amount']];
      analytics.basata.categoryData.forEach(c => basataRows.push([c.name, `${c.amount.toLocaleString()} EGP`]));
      slide4.addTable(basataRows, { x: 0.5, y: 1.5, w: 9, border: { pt: 1, color: "CBD5E0" }, fill: "F7FAFC", fontSize: 12 });
    }

    // 5. CALLS LOG PERFORMANCE
    let slide5 = pptx.addSlide();
    slide5.addText(language === 'ar' ? "أداء مركز الاتصال" : "Call Center Performance", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: "f59e0b" });
    const cStats = [
      [language === 'ar' ? 'المؤشر' : 'Metric', language === 'ar' ? 'القيمة' : 'Value'],
      [language === 'ar' ? 'إجمالي المكالمات' : 'Total Calls', String(analytics.calls.total)],
      [language === 'ar' ? 'المكالمات الصادرة' : 'Calls Made', String(analytics.calls.taken)],
      [language === 'ar' ? 'المكالمات المحلولة' : 'Resolved', String(analytics.calls.resolved)],
      [language === 'ar' ? 'نسبة التغطية' : 'Coverage Rate', `${analytics.calls.coverage}%`]
    ];
    slide5.addTable(cStats, { x: 0.5, y: 1.2, w: 9, border: { pt: 1, color: "CBD5E0" }, fill: "F7FAFC", fontSize: 14 });

    // 6. FINANCIAL SUMMARY
    let slide6 = pptx.addSlide();
    slide6.addText(language === 'ar' ? "الملخص المالي النهائي" : "Final Financial Summary", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: "10b981" });
    const fStats = [
      [language === 'ar' ? 'القناة' : 'Channel', language === 'ar' ? 'صافي المركز' : 'Net Position'],
      [" J ", `${(analytics.jumia.cash - analytics.jumia.returnedAmt).toLocaleString()} EGP`],
      ["Bosta", `${(analytics.bosta.cash - analytics.bosta.returnedAmt).toLocaleString()} EGP`],
      ["Basata", `${analytics.basata.volume.toLocaleString()} EGP`],
      [language === 'ar' ? 'الإجمالي النهائي' : 'GRAND TOTAL', `${analytics.grandTotal.toLocaleString()} EGP`]
    ];
    slide6.addTable(fStats, { x: 0.5, y: 1.2, w: 9, border: { pt: 1, color: "CBD5E0" }, fill: "F7FAFC", fontSize: 16, bold: true });

    // Save
    await pptx.writeFile({ fileName: `${filename}.pptx` });
  } catch (error) {
    console.error('PPTX export failed:', error);
    alert('PowerPoint export failed: ' + (error.message || 'Unknown error'));
  }
};
