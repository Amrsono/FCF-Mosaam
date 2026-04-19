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
      row[h.label] = typeof h.accessor === 'function' ? h.accessor(item) : item[h.accessor];
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

export const exportToPDF = (data, headers, filename, title) => {
  const doc = new jsPDF();
  
  if (title) {
    doc.setFontSize(18);
    doc.text(title, 14, 22);
  }

  // Pre-process headers for autotable
  const tableColumn = headers.map(h => h.label);
  const tableRows = data.map(item => {
    return headers.map(h => typeof h.accessor === 'function' ? h.accessor(item) : item[h.accessor]);
  });

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: title ? 30 : 14,
    theme: 'grid',
    headStyles: { fillColor: [80, 60, 255] }
  });

  doc.save(`${filename}.pdf`);
};
