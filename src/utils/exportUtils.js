import * as XLSX from 'xlsx';
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
    slide2.addText(language === 'ar' ? "أداء جوميا" : "Jumia Performance", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: "7864ff" });
    
    const jStats = [
      [language === 'ar' ? 'المؤشر' : 'Metric', language === 'ar' ? 'القيمة' : 'Value'],
      [language === 'ar' ? 'تم الاستلام من قبل العميل' : 'Picked Up by customer', String(analytics.jumia.pickedUpCount)],
      [`  - Small (S)`, String(analytics.jumia.sizes?.S || 0)],
      [`  - Medium (M)`, String(analytics.jumia.sizes?.M || 0)],
      [`  - Large (L)`, String(analytics.jumia.sizes?.L || 0)],
      [language === 'ar' ? 'إجمالي النقد المحصل' : 'Total Cash Collected', `${analytics.jumia.cash.toLocaleString()} EGP`],
      [`  - ${language === 'ar' ? 'بنها 1' : 'Banha 1'}`, `${(analytics.jumia.cashByOutlet?.eltalg || 0).toLocaleString()} EGP`],
      [`  - ${language === 'ar' ? 'بنها 2' : 'Banha 2'}`, `${(analytics.jumia.cashByOutlet?.tegara || 0).toLocaleString()} EGP`],
      [`  - ${language === 'ar' ? 'بنها 3' : 'Banha 3'}`, `${(analytics.jumia.cashByOutlet?.mostashfa || 0).toLocaleString()} EGP`],
      [`  - ${language === 'ar' ? 'نقدي' : 'Cash'}`, `${(analytics.jumia.cashTotal || 0).toLocaleString()} EGP`],
      [`  - ${language === 'ar' ? 'جوميا باي (أونلاين)' : 'Jumia Pay (Online)'}`, `${(analytics.jumia.jumiaPayTotal || 0).toLocaleString()} EGP`],
      [language === 'ar' ? 'المرتجع' : 'Returns', String(analytics.jumia.returnedCount)],
      [language === 'ar' ? 'غرامات التخزين' : 'Storage Penalties', `${analytics.jumia.penalties.toLocaleString()} EGP`]
    ];
    slide2.addTable(jStats, { x: 0.5, y: 1.2, w: 9, border: { pt: 1, color: "CBD5E0" }, fill: "F7FAFC", fontSize: 14 });

    // 3. BOSTA PERFORMANCE
    let slide3 = pptx.addSlide();
    slide3.addText(language === 'ar' ? "أداء بوسطة" : "Bosta Performance", { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: "6366f1" });
    const bStats = [
      [language === 'ar' ? 'المؤشر' : 'Metric', language === 'ar' ? 'القيمة' : 'Value'],
      [language === 'ar' ? 'الطلبات المستلمة بنجاح' : 'Orders Handled Successfully', String(analytics.bosta.pickedUpCount)],
      [`  - Small (S)`, String(analytics.bosta.sizes?.S || 0)],
      [`  - Medium (M)`, String(analytics.bosta.sizes?.M || 0)],
      [`  - Large (L)`, String(analytics.bosta.sizes?.L || 0)],
      [language === 'ar' ? 'إجمالي النقد المحصل' : 'Total Cash Collected', `${analytics.bosta.cash.toLocaleString()} EGP`],
      [`  - ${language === 'ar' ? 'بنها 1' : 'Banha 1'}`, `${(analytics.bosta.cashByOutlet?.eltalg || 0).toLocaleString()} EGP`],
      [`  - ${language === 'ar' ? 'بنها 2' : 'Banha 2'}`, `${(analytics.bosta.cashByOutlet?.tegara || 0).toLocaleString()} EGP`],
      [`  - ${language === 'ar' ? 'بنها 3' : 'Banha 3'}`, `${(analytics.bosta.cashByOutlet?.mostashfa || 0).toLocaleString()} EGP`],
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
      ["Jumia", `${analytics.jumia.cash.toLocaleString()} EGP`],
      ["Bosta", `${analytics.bosta.cash.toLocaleString()} EGP`],
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
