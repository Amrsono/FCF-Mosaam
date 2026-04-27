import * as XLSX from 'xlsx';
import pdfMake from 'pdfmake/build/pdfmake';
import pptxgen from "pptxgenjs";
import { reshapeArabic } from './arabicReshaper';

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

const toArabicNumerals = (str) => {
  return str.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
};

const loadArabicFont = async () => {
  if (_fontCache) return _fontCache;
  if (_fontPromise) return _fontPromise;

  _fontPromise = (async () => {
    try {
      // Cairo is the most popular font for Egyptian web/mobile interfaces
      const res = await fetch(
        'https://fonts.gstatic.com/s/cairo/v28/SLXGc1j96_pY_m48_jw6AnS4_H8f.ttf'
      );
      if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
      const buffer = await res.arrayBuffer();
      
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      _fontCache = btoa(binary);

      // Register with pdfMake
      pdfMake.vfs = pdfMake.vfs || {};
      pdfMake.vfs['Cairo-Regular.ttf'] = _fontCache;
      
      pdfMake.fonts = {
        Cairo: {
          normal: 'Cairo-Regular.ttf',
          bold: 'Cairo-Regular.ttf',
          italics: 'Cairo-Regular.ttf',
          bolditalics: 'Cairo-Regular.ttf'
        },
        Roboto: {
          normal: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf',
          bold: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf',
          italics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Italic.ttf',
          bolditalics: 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-MediumItalic.ttf'
        }
      };

      return _fontCache;
    } catch (err) {
      console.warn('Could not load Cairo font for PDF:', err);
      return null;
    } finally {
      _fontPromise = null;
    }
  })();

  return _fontPromise;
};

/**
 * Safely convert any value to a printable string for PDF cells.
 * Also handles Arabic text by reshaping (joining) and then reversing it for jsPDF's LTR engine.
 */
/**
 * Safely convert any value to a printable string for PDF cells.
 * Also handles Arabic text by reshaping (joining) and then reversing it for jsPDF's LTR engine.
 */
const safeString = (val, isPdfMake = false) => {
  if (val == null) return '';
  let str = '';
  if (typeof val === 'object') {
    if (val instanceof Date) str = val.toLocaleString();
    else str = JSON.stringify(val);
  } else {
    str = String(val);
  }

  // Detect Arabic characters
  if (/[\u0600-\u06FF]/.test(str)) {
    // 1. Reshape the Arabic text to join characters correctly
    const reshaped = reshapeArabic(str);
    // 2. If using pdfMake with RTL support, we do NOT reverse the string.
    // jsPDF needs reversing because it draws LTR only.
    return isPdfMake ? reshaped : reshaped.split('').reverse().join('');
  }
  return str;
};

export const exportToPDF = async (data, headers, filename, title) => {
  try {
    await loadArabicFont();

    // Detect RTL Needs
    const isRtl = /[\u0600-\u06FF]/.test(title || '') || headers.some(h => /[\u0600-\u06FF]/.test(h.label));

    // Prepare table headers and rows
    const tableHeaders = headers.map(h => ({
      text: safeString(h.label, true),
      style: 'tableHeader'
    }));

    const tableRows = data.map(item =>
      headers.map(h => {
        const raw = typeof h.accessor === 'function' ? h.accessor(item) : item[h.accessor];
        return {
          text: safeString(raw, true),
          style: 'tableCell'
        };
      })
    );

    const docDefinition = {
      content: [
        title ? { 
          text: safeString(title, true), 
          style: 'header', 
          alignment: isRtl ? 'right' : 'left',
          rtl: isRtl 
        } : null,
        {
          table: {
            headerRows: 1,
            widths: headers.map(() => '*'),
            body: [tableHeaders, ...tableRows]
          },
          layout: {
            fillColor: (rowIndex) => {
              if (rowIndex === 0) return '#503CFF';
              return (rowIndex % 2 === 0) ? '#F5F5FF' : null;
            }
          },
          rtl: isRtl
        }
      ],
      defaultStyle: {
        font: 'Cairo',
        fontSize: 10
      },
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          margin: [0, 0, 0, 10]
        },
        tableHeader: {
          bold: true,
          fontSize: 11,
          color: 'white',
          alignment: isRtl ? 'right' : 'left',
          margin: [3, 5, 3, 5]
        },
        tableCell: {
          fontSize: 9,
          alignment: isRtl ? 'right' : 'left',
          margin: [3, 3, 3, 3]
        }
      },
      // Essential for Arabic/RTL support in pdfmake
      pageOrientation: 'portrait',
      pageMargins: [40, 40, 40, 40]
    };

    // If RTL, set the direction
    if (isRtl) {
      // pdfMake handles the direction of the whole document or specific blocks
      docDefinition.content.forEach(item => {
        if (item && item.table) {
          // Reverse column order for RTL table layout
          item.table.body = item.table.body.map(row => row.reverse());
        }
      });
    }

    pdfMake.createPdf(docDefinition).download(`${filename}.pdf`);
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
